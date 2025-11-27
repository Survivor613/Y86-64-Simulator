#pragma once
#include "global.h"
#include <array>

class Register{
    private:
        std::array<word_t, 16> regs;  // 大小不可变，使用 array

    public:
    Register();
    void reset();

    // 读写单个字节
    void setReg(Reg::ID id, word_t val);
    word_t getReg(Reg::ID id) const;

    // 获取所有寄存器用于打印   
    const std::array<word_t, 16>& getAll() const;
};