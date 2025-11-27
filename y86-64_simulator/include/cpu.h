#pragma once
#include "global.h"
#include "register.h"
#include "memory.h"

struct ConditionCode{
    bool zf = true; // zero flag
    bool sf = false; // signed flag
    bool of = false; // overflow flag
};

class CPU{
    public:
        Memory& mem;
        Register reg;
        ConditionCode cc;

        addr_t PC = 0;
        Stat stat = Stat::AOK;

        // 中间信号
        int icode = ICode::NOP;
        int ifunc;
        Reg::ID rA = Reg::NONE, rB = Reg::NONE;
        word_t valA = 0, valB = 0, valC = 0, valE = 0, valM = 0;
        addr_t valP = 0;
        bool Cnd = false;

        CPU(Memory& memory);
        void reset();
        void step(); // 一套SEQ流程

    private:
        bool fetch();
        bool decode();
        bool execute();
        bool memory_stage();
        bool writeback();
        void updatePC();

        // execute阶段辅助函数
        void setALU(word_t& aluA, word_t& aluB, ALU::Op& op);
        word_t execALU(const word_t& aluA, const word_t& aluB, const ALU::Op& op);
        void setCC(word_t& aluA, word_t& aluB, ALU::Op& op);

        // writeback阶段辅助函数
        bool cond();
};