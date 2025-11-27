#pragma once
#include "global.h"

class Memory{
    public:
        static const int MAX_SIZE = 0x2000;
        std::vector<byte_t> data;  // 大小可变，使用 vector

    Memory();
    void reset();

    // 读写单个字节
    bool writeByte(addr_t addr, byte_t val);
    byte_t readByte(addr_t addr, bool& error) const;

    // 读写 1 个 byte
    bool writeWord(addr_t addr, word_t val);
    word_t readWord(addr_t addr, bool& error) const;
};