#pragma once

#include <cstdint> // 使用标准，例如 int64_t
#include <vector>
#include <iostream>  // 简易在 IO 输出报错信息

// 类型定义
using word_t = int64_t;
using byte_t = uint8_t;
using addr_t = uint64_t; // byte和address不需要负数，使用unsigned int，word需要负数，使用signed int

// 状态码
enum class Stat{
    AOK = 1,
    HLT = 2,
    ADR = 3,
    INS = 4
};

// 寄存器 ID
namespace Reg{
    enum ID{
        RAX = 0,
        RCX = 1,
        RDX = 2,
        RBX = 3,
        RSP = 4,
        RBP = 5,
        RSI = 6,
        RDI = 7,
        R8 = 8,
        R9 = 9,
        R10 = 10,
        R11 = 11,
        R12 = 12,
        R13 = 13,
        R14 = 14,
        NONE = 15,
    };
}

// 指令集
namespace ICode{
    enum ID{
        HALT = 0,
        NOP = 1,
        RRMOVQ = 2,  // 7种
        IRMOVQ = 3,
        RMMOVQ = 4,
        MRMOVQ = 5,
        OPQ = 6, // 4种
        JXX = 7, // 7种
        CALL = 8,
        RET = 9,
        PUSHQ = 0xA,
        POPQ = 0xB
    };
}

// ALU 运算
namespace ALU{
    enum Op{
        ADD = 0,
        SUB = 1,
        AND = 2,
        XOR = 3
    };
}

// 跳转条件
namespace Cond{
    enum Type{
        None = 0,
        LE = 1,
        L = 2,
        E = 3,
        NE = 4,
        GE = 5,
        G = 6
    };
}