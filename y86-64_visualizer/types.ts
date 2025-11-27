
// Enums based on standard Y86-64 definitions
export enum Stat {
  AOK = 1,
  HLT = 2,
  ADR = 3,
  INS = 4
}

export interface CCMapping {
  ZF: number;
  SF: number;
  OF: number;
}

// Maps register names to values. 
// Values are numbers (safe integer range) or strings if huge, 
// but for UI visualization standard numbers usually suffice.
export type RegisterMap = Record<string, number>;
export type Registers = RegisterMap;

// Maps memory address (string/number) to value (number)
export type MemoryMap = Record<string, number>;

// Exact shape of one step from main.cpp JSON output
export interface SimulationStep {
  PC: number;
  STAT: number;
  REG: RegisterMap;
  CC: CCMapping;
  MEM: MemoryMap;
}

export interface SimulationResult {
  steps: SimulationStep[];
  sourceCode: string;
}