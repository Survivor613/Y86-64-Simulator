import { SimulationResult, SimulationStep, Stat, RegisterMap, MemoryMap, CCMapping } from '../types';
import { INITIAL_REGISTERS, REGISTER_ORDER } from '../constants';

// --- CONSTANTS & ENUMS (Internal to Simulation) ---
const MAX_MEM_SIZE = 0x20000; // 128KB memory space
const MAX_STEPS = 10000;

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
      // Little endian: take lowest 8 bits
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
    value = BigInt.asUintN(64, value); // Ensure unsigned 64-bit interpretation
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
      this.valP = this.PC;
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

    // Aligned strictly with C++ decode logic
    if ([ICode.HALT, ICode.NOP, ICode.RRMOVQ, ICode.IRMOVQ, ICode.RMMOVQ, ICode.MRMOVQ, ICode.OPQ].includes(this.icode)) {
      srcA = this.rA;
      srcB = this.rB;
    } else if ([ICode.PUSHQ, ICode.POPQ, ICode.CALL, ICode.RET].includes(this.icode)) {
      srcA = this.rA;
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

    // Aligned strictly with C++ setALU logic
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
      default:           aluA = 0n;        aluB = 0n; break;
    }

    // execALU
    // Convert to signed integers for arithmetic
    const a = BigInt.asIntN(64, aluA);
    const b = BigInt.asIntN(64, aluB);
    let r = 0n;

    switch (op) {
      case AluOp.ADD: r = b + a; break;
      case AluOp.SUB: r = b - a; break;
      case AluOp.AND: r = b & a; break;
      case AluOp.XOR: r = b ^ a; break;
    }

    this.valE = BigInt.asUintN(64, r); // Keep internal valE as unsigned representation of result

    // setCC
    if (this.icode === ICode.OPQ) {
      const signedE = BigInt.asIntN(64, this.valE);
      
      this.cc.zf = (signedE === 0n);
      this.cc.sf = (signedE < 0n);
      
      if (op === AluOp.ADD) {
        this.cc.of = (a > 0n && b > 0n && signedE < 0n) || (a < 0n && b < 0n && signedE > 0n);
      } else if (op === AluOp.SUB) {
        this.cc.of = (a < 0n && b > 0n && signedE < 0n) || (a > 0n && b < 0n && signedE > 0n);
      } else {
        this.cc.of = false;
      }
    }

    return true;
  }

  memory_stage(): boolean {
    const addrE = Number(BigInt.asUintN(64, this.valE));

    switch (this.icode) {
      case ICode.RMMOVQ:
      case ICode.PUSHQ:
        // M[valE] ← valA
        if (this.mem.writeWord(addrE, this.valA)) {
          this.stat = Stat.ADR; return false;
        }
        break;
      
      case ICode.CALL:
        // M[valE] ← valP (CRITICAL FIX: Write return address, not valA)
        if (this.mem.writeWord(addrE, BigInt(this.valP))) {
          this.stat = Stat.ADR; return false;
        }
        break;

      case ICode.MRMOVQ: {
        const res = this.mem.readWord(addrE);
        if (res.error) { this.stat = Stat.ADR; return false; }
        this.valM = res.val;
        break;
      }
      
      case ICode.POPQ: {
         // valM ← M[valB]
         const addrB = Number(BigInt.asUintN(64, this.valB));
         const res = this.mem.readWord(addrB);
         if (res.error) { this.stat = Stat.ADR; return false; }
         this.valM = res.val;
         break;
      }
      
      case ICode.RET: {
        // valM ← M[valB]
        const addrB = Number(BigInt.asUintN(64, this.valB));
        const res = this.mem.readWord(addrB);
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
      if (this.cond()) {
        this.PC = Number(BigInt.asUintN(64, this.valC));
        return;
      }
    } else if (this.icode === ICode.CALL) {
      this.PC = Number(BigInt.asUintN(64, this.valC));
      return;
    } else if (this.icode === ICode.RET) {
      this.PC = Number(BigInt.asUintN(64, this.valM));
      return;
    }

    this.PC = this.valP;
  }

  step() {
    if (this.stat === Stat.AOK) {
      if (this.fetch() && this.decode() && this.execute() && this.memory_stage() && this.writeback()) {
        this.updatePC();
      }
    }
  }
}

// --- LOADER ---

const loadProgram = (content: string, mem: Memory): boolean => {
  const lines = content.split('\n');
  for (const line of lines) {
    // Look for patterns like: "  0x014: 30f40001000000000000 | irmovq $256, %rsp"
    // Regex matches 0x(ADDR): (HEXDATA)
    const match = line.match(/^\s*0x([0-9a-fA-F]+)\s*:\s*([0-9a-fA-F]+)/);
    if (match) {
      const addrStr = match[1];
      const dataStr = match[2];
      let addr = parseInt(addrStr, 16);
      
      // Parse hex string into bytes
      for (let i = 0; i < dataStr.length; i += 2) {
        const byteHex = dataStr.substring(i, i + 2);
        const byteVal = parseInt(byteHex, 16);
        if (mem.writeByte(addr, byteVal)) {
           return false; // Load error (out of bounds)
        }
        addr++;
      }
    }
  }
  return true;
};

// --- SIMULATION RUNNER ---

const captureState = (cpu: CPU): SimulationStep => {
  // Convert Registers
  const regs: RegisterMap = {};
  REGISTER_ORDER.forEach((name, idx) => {
    regs[name] = Number(cpu.reg.getReg(idx));
  });

  // Convert Memory (only non-zero)
  const memMap: MemoryMap = {};
  // Optimization: In a real sparse memory, iterate known blocks. 
  // Here we scan checking for non-zero to match main.cpp output style.
  // Displaying 128KB is too much, so we stick to the provided example logic:
  // "step through every 8 bytes"
  for (let i = 0; i < MAX_MEM_SIZE; i += 8) {
    const w = cpu.mem.readWord(i);
    if (!w.error && w.val !== 0n) {
      memMap[i.toString()] = Number(w.val);
    }
  }

  return {
    PC: cpu.PC,
    STAT: cpu.stat,
    REG: regs,
    CC: { ZF: cpu.cc.zf ? 1 : 0, SF: cpu.cc.sf ? 1 : 0, OF: cpu.cc.of ? 1 : 0 },
    MEM: memMap
  };
};

export const runSimulation = async (file: File): Promise<SimulationResult> => {
  const text = await file.text();
  
  const mem = new Memory();
  const cpu = new CPU(mem);

  // Load Program
  if (!loadProgram(text, mem)) {
    throw new Error("Failed to load program");
  }

  const steps: SimulationStep[] = [];
  let cycle = 0;

  // 1. Capture Initial State (Before any execution)
  steps.push(captureState(cpu));

  // 2. Run Loop
  while (cpu.stat === Stat.AOK && cycle < MAX_STEPS) {
    cpu.step();
    cycle++;
    steps.push(captureState(cpu));
  }

  return {
    steps: steps,
    sourceCode: text
  };
};