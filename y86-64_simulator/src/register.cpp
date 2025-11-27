#include "../include/global.h"
#include "../include/register.h"

Register::Register() { reset(); }

void Register::reset() { regs.fill(0); }

void Register::setReg(Reg::ID id, word_t val){
    if (id == Reg::NONE)  // 强类型，不需要 id > 0xF
        return;    
    else regs[id] = val;
}

word_t Register::getReg(Reg::ID id) const{
    if (id == Reg::NONE)
        return 0;
    else return regs[id];
}

const std::array<word_t, 16>& Register::getAll() const { return regs; }