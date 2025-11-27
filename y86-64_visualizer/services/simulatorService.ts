import { SimulationResult, SimulationStep, Stat } from '../types';

// --- CONSTANTS & ENUMS (Internal to Simulation) ---
const MAX_MEM_SIZE = 0x20000; // 128KB memory space for simulation

enum RegID {
  RAX = 0, RCX = 1, RDX = 2, RBX = 3, RSP = 4, RBP = 5, RSI = 6, RDI = 7,
  R8 = 8, R9 = 9, R10 = 10, R11 = 11, R12 = 12, R13 = 13, R14 = 14, NONE = 15
}

enum ICode {
  HALT = 0, NOP = 1, RRMOVQ = 2, IRMOVQ = 3, RMMOVQ = 4, MRMOVQ = 5,
  OPQ = 6, JXX = 7, CALL = 8, RET = 9, PUSHQ = 0xA, POPQ = 0xB
}

enum AluOp { ADD = 0, SUB = 1, AND = 2, XOR = 3 }
enum Cond { NONE = 0, LE = 1, L = 2, E = 3, NE = 4, GE = 5, G = 6 }

// --- PORTED CLASSES ---

class Register {
  private regs: BigInt64Array;

  constructor() {
    this.regs = new BigInt64Array(16);
    this.reset();
  }

  reset() {
    this.regs.fill(0n);
  }

  setReg(id: number, val: bigint) {
    if (id >= 0 && id < 15) {
      this.regs[id] = val;
    }
  }

  getReg(id: number): bigint {
    if (id >= 0 && id < 15) {
      return this.regs[id];
    }
    return 0n;
  }

  getAll(): BigInt64Array {
    return this.regs;
  }
}

class Memory {
  public data: Uint8Array;

  constructor() {
    this.data = new Uint8Array(MAX_MEM_SIZE);
  }

  reset() {
    this.data.fill(0);
  }

  writeByte(addr: number, val: number): boolean {
    if (addr < 0 || addr >= MAX_MEM_SIZE) return true; // Error
    this.data[addr] = val & 0xFF;
    return false;
  }

  readByte(addr: number): { val: number; error: boolean } {
    if (addr < 0 || addr >= MAX_MEM_SIZE) {
      return { val: 0, error: true };
    }
    return { val: this.data[addr], error: false };
  }

  writeWord(addr: number, val: bigint): boolean {
    if (addr < 0 || addr > MAX_MEM_SIZE - 8) return true;
    for (let i = 0; i < 8; i++) {
      // Little endian: take lowest 8 bits, shift right
      const byte = Number((val >> BigInt(i * 8)) & 0xFFn);
      this.data[addr + i] = byte;
    }
    return false;
  }

  readWord(addr: number): { val: bigint; error: boolean } {
    if (addr < 0 || addr > MAX_MEM_SIZE - 8) {
      return { val: 0n, error: true };
    }
    let value = 0n;
    for (let i = 0; i < 8; i++) {
      const byte = BigInt(this.data[addr + i]);
      // Little endian: shift left and OR
      value |= (byte << BigInt(i * 8));
    }
    // Handle unsigned to signed conversion if necessary (standard Y86 usually treats memory as raw bits)
    // We treat readWord as returning raw 64-bit block.
    // However, JS BitInts are arbitrary precision. To simulate 64-bit unsigned read:
    value = BigInt.asUintN(64, value);
    return { val: value, error: false };
  }
}

class CPU {
  public mem: Memory;
  public reg: Register;
  
  // State
  public PC: number = 0;
  public stat: Stat = Stat.AOK;
  public cc = { zf: true, sf: false, of: false };

  // Internal signals
  private icode: number = ICode.NOP;
  private ifunc: number = 0;
  private rA: number = RegID.NONE;
  private rB: number = RegID.NONE;
  private valC: bigint = 0n;
  private valP: number = 0;
  private valA: bigint = 0n;
  private valB: bigint = 0n;
  private valE: bigint = 0n;
  private valM: bigint = 0n;

  constructor(mem: Memory) {
    this.mem = mem;
    this.reg = new Register();
    this.reset();
  }

  reset() {
    this.reg.reset();
    this.cc = { zf: true, sf: false, of: false };
    this.PC = 0;
    this.stat = Stat.AOK;
  }

  // --- STAGES ---

  fetch(): boolean {
    const b0 = this.mem.readByte(this.PC);
    if (b0.error) { this.stat = Stat.ADR; return false; }
    
    this.icode = (b0.val >> 4) & 0xF;
    this.ifunc = b0.val & 0xF;
    this.valP = this.PC + 1;

    if (this.icode === ICode.HALT) {
      this.stat = Stat.HLT;
      this.valP = this.PC; // Don't advance
      return true;
    }

    const needReg = [ICode.RRMOVQ, ICode.IRMOVQ, ICode.RMMOVQ, ICode.MRMOVQ, ICode.OPQ, ICode.PUSHQ, ICode.POPQ].includes(this.icode);
    const needValC = [ICode.IRMOVQ, ICode.MRMOVQ, ICode.RMMOVQ, ICode.JXX, ICode.CALL].includes(this.icode);

    if (needReg) {
      const b1 = this.mem.readByte(this.valP);
      if (b1.error) { this.stat = Stat.ADR; return false; }
      this.rA = (b1.val >> 4) & 0xF;
      this.rB = b1.val & 0xF;
      this.valP += 1;
    } else {
      this.rA = RegID.NONE;
      this.rB = RegID.NONE;
    }

    if (needValC) {
      const w = this.mem.readWord(this.valP);
      if (w.error) { this.stat = Stat.ADR; return false; }
      this.valC = w.val;
      this.valP += 8;
    }

    return true;
  }

  decode(): boolean {
    let srcA = RegID.NONE;
    let srcB = RegID.NONE;

    if ([ICode.RRMOVQ, ICode.RMMOVQ, ICode.OPQ, ICode.PUSHQ].includes(this.icode)) {
      srcA = this.rA;
    } else if ([ICode.POPQ, ICode.RET].includes(this.icode)) {
      srcA = RegID.RSP;
    }

    if ([ICode.RRMOVQ, ICode.IRMOVQ, ICode.RMMOVQ, ICode.MRMOVQ, ICode.OPQ].includes(this.icode)) {
      srcB = this.rB;
    } else if ([ICode.PUSHQ, ICode.POPQ, ICode.CALL, ICode.RET].includes(this.icode)) {
      srcB = RegID.RSP;
    }

    this.valA = this.reg.getReg(srcA);
    this.valB = this.reg.getReg(srcB);
    return true;
  }

  execute(): boolean {
    if (this.icode === ICode.JXX) return true;

    let aluA = 0n;
    let aluB = 0n;
    let op = AluOp.ADD;

    switch (this.icode) {
      case ICode.RRMOVQ: aluA = this.valA; aluB = 0n; break;
      case ICode.IRMOVQ: aluA = this.valC; aluB = 0n; break;
      case ICode.RMMOVQ: 
      case ICode.MRMOVQ: aluA = this.valC; aluB = this.valB; break;
      case ICode.OPQ:    aluA = this.valA; aluB = this.valB; op = this.ifunc; break;
      case ICode.PUSHQ:  aluA = -8n;       aluB = this.valB; break;
      case ICode.POPQ:   aluA = 8n;        aluB = this.valB; break;
      case ICode.CALL:   aluA = -8n;       aluB = this.valB; break;
      case ICode.RET:    aluA = 8n;        aluB = this.valB; break;
    }

    // Exec ALU
    const a = BigInt.asIntN(64, aluA);
    const b = BigInt.asIntN(64, aluB);
    let r = 0n;

    switch (op) {
      case AluOp.ADD: r = b + a; break;
      case AluOp.SUB: r = b - a; break;
      case AluOp.AND: r = b & a; break;
      case AluOp.XOR: r = b ^ a; break;
    }

    this.valE = BigInt.asIntN(64, r);

    // Set CC
    if (this.icode === ICode.OPQ) {
      this.cc.zf = (this.valE === 0n);
      this.cc.sf = (this.valE < 0n);
      
      if (op === AluOp.ADD) {
        this.cc.of = (a > 0n && b > 0n && this.valE < 0n) || (a < 0n && b < 0n && this.valE > 0n);
      } else if (op === AluOp.SUB) {
        this.cc.of = (a < 0n && b > 0n && this.valE < 0n) || (a > 0n && b < 0n && this.valE > 0n);
      } else {
        this.cc.of = false;
      }
    }

    return true;
  }

  memory_stage(): boolean {
    switch (this.icode) {
      case ICode.RMMOVQ:
      case ICode.PUSHQ:
      case ICode.CALL: {
        const addr = Number(BigInt.asUintN(64, this.valE));
        if (this.mem.writeWord(addr, this.valA)) {
          this.stat = Stat.ADR; return false;
        }
        break;
      }
      case ICode.MRMOVQ: {
        const addr = Number(BigInt.asUintN(64, this.valE));
        const res = this.mem.readWord(addr);
        if (res.error) { this.stat = Stat.ADR; return false; }
        this.valM = res.val;
        break;
      }
      case ICode.POPQ: {
         const readAddr = Number(BigInt.asUintN(64, this.valB));
         const res = this.mem.readWord(readAddr);
         if (res.error) { this.stat = Stat.ADR; return false; }
         this.valM = res.val;
         break;
      }
      case ICode.RET: {
        const addr = Number(BigInt.asUintN(64, this.valB));
        const res = this.mem.readWord(addr);
        if (res.error) { this.stat = Stat.ADR; return false; }
        this.valM = res.val;
        break;
      }
    }
    return true;
  }

  cond(): boolean {
    switch (this.ifunc) {
      case Cond.NONE: return true;
      case Cond.LE:   return (this.cc.sf !== this.cc.of) || this.cc.zf;
      case Cond.L:    return (this.cc.sf !== this.cc.of);
      case Cond.E:    return this.cc.zf;
      case Cond.NE:   return !this.cc.zf;
      case Cond.GE:   return !(this.cc.sf !== this.cc.of);
      case Cond.G:    return !(this.cc.sf !== this.cc.of) && !this.cc.zf;
      default: return false;
    }
  }

  writeback(): boolean {
    if (this.stat === Stat.INS || this.stat === Stat.HLT || this.stat === Stat.ADR) return false;

    if (this.icode === ICode.RRMOVQ) {
       if (this.cond()) this.reg.setReg(this.rB, this.valE);
    } else if (this.icode === ICode.IRMOVQ || this.icode === ICode.OPQ) {
       this.reg.setReg(this.rB, this.valE);
    } else if (this.icode === ICode.MRMOVQ) {
       this.reg.setReg(this.rA, this.valM);
    } else if (this.icode === ICode.PUSHQ || this.icode === ICode.POPQ || this.icode === ICode.CALL || this.icode === ICode.RET) {
       this.reg.setReg(RegID.RSP, this.valE);
       if (this.icode === ICode.POPQ) {
         this.reg.setReg(this.rA, this.valM);
       }
    }
    return true;
  }

  updatePC() {
    if (this.stat !== Stat.AOK) return;

    if (this.icode === ICode.JXX) {
      this.PC = this.cond() ? Number(BigInt.asUintN(64, this.valC)) : this.valP;
    } else if (this.icode === ICode.CALL) {
      this.PC = Number(BigInt.asUintN(64, this.valC));
    } else if (this.icode === ICode.RET) {
      this.PC = Number(BigInt.asUintN(64, this.valM));
    } else {
      this.PC = this.valP;
    }
  }

  step() {
    if (this.stat === Stat.AOK) {
      if (!this.fetch()) return;
      this.decode();
      this.execute();
      if (!this.memory_stage()) return;
      this.writeback();
      this.updatePC();
    }
  }
}

// --- LOADER ---
class Loader {
  static load(content: string, mem: Memory): boolean {
    const lines = content.split('\n');
    let hasContent = false;

    for (const line of lines) {
      const match = line.match(/^\s*0x([0-9a-fA-F]+)\s*:\s*([0-9a-fA-F]+)/);
      if (match) {
        const addrStr = match[1];
        const dataStr = match[2];
        let addr = parseInt(addrStr, 16);
        
        for (let i = 0; i < dataStr.length; i += 2) {
          const byteVal = parseInt(dataStr.substring(i, i + 2), 16);
          if (mem.writeByte(addr, byteVal)) {
            console.error("Loader error: Out of bounds");
            return false;
          }
          addr++;
        }
        hasContent = true;
      }
    }
    return hasContent;
  }
}

// --- MAIN SIMULATION FUNCTION ---
export const runSimulation = async (file: File): Promise<SimulationResult> => {
  const content = await file.text();
  
  const mem = new Memory();
  const cpu = new CPU(mem);

  const loaded = Loader.load(content, mem);
  if (!loaded) {
    throw new Error("Failed to load .yo file");
  }

  const stepsData: SimulationStep[] = [];
  const MAX_STEPS = 10000;
  let steps = 0;

  // Helper to snapshot state exactly like main.cpp :: printStateJSON
  const captureState = (cpu: CPU): SimulationStep => {
    // Registers
    const regNames = ["rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi", 
                      "r8", "r9", "r10", "r11", "r12", "r13", "r14"];
    const regMap: Record<string, number> = {};
    for (let i = 0; i < 15; i++) {
        regMap[regNames[i]] = Number(cpu.reg.getReg(i)); 
    }

    // Memory (Non-zero only)
    const memMap: Record<string, number> = {};
    for (let i = 0; i < MAX_MEM_SIZE; i += 8) {
        const res = cpu.mem.readWord(i);
        if (!res.error && res.val !== 0n) {
            memMap[i.toString()] = Number(res.val);
        }
    }

    return {
        PC: cpu.PC,
        STAT: cpu.stat,
        REG: regMap,
        CC: {
            ZF: cpu.cc.zf ? 1 : 0,
            SF: cpu.cc.sf ? 1 : 0,
            OF: cpu.cc.of ? 1 : 0
        },
        MEM: memMap
    };
  };

  // --- CRITICAL CHANGE ---
  // Capture initial state (Step 0) BEFORE execution loop
  // This ensures the visualizer starts at PC=0 (or entry point)
  stepsData.push(captureState(cpu));

  // Run loop
  while (cpu.stat === Stat.AOK && steps < MAX_STEPS) {
    cpu.step();
    steps++;
    stepsData.push(captureState(cpu));
  }

  return {
    steps: stepsData,
    sourceCode: content
  };
};