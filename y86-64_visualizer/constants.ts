
import { Registers } from './types';

export const INITIAL_REGISTERS: Registers = {
  rax: 0, rcx: 0, rdx: 0, rbx: 0,
  rsp: 0, rbp: 0, rsi: 0, rdi: 0,
  r8: 0, r9: 0, r10: 0, r11: 0,
  r12: 0, r13: 0, r14: 0
};

export const REGISTER_ORDER: string[] = [
  'rax', 'rcx', 'rdx', 'rbx', 'rsp', 'rbp', 'rsi', 'rdi',
  'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14'
];

export const MOCK_DELAY = 800; // ms for fake loading