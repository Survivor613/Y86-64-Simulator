#include "../include/global.h"
#include "../include/memory.h"
#include <cmath>

Memory::Memory() : data(MAX_SIZE, 0) {}

void Memory::reset() {std::fill(data.begin(), data.end(), 0);}  // vector类没有.fill成员函数

bool Memory::writeByte(addr_t addr, byte_t val){
    if (addr >= MAX_SIZE) {return true;} // Error: Out of Bounds
    else {
        data[addr] = val;
        return false;
    }
}

byte_t Memory::readByte(addr_t addr, bool& error) const{
    if (addr >= MAX_SIZE) {
        error = true;
        return 0;
    } // Error: Out of Bounds
    else {
        error = false;
        return data[addr];
    }
}

bool Memory::writeWord(addr_t addr, word_t val){
    if (addr > MAX_SIZE - 8) {return true;}    // 不能写成 addr + 8 > MAX_SIZE, 存在上溢出风险！(0xFFFFFFFFFFFFFFF8 + 8 = 0 < MAX_SIZE)
    else {
        for (int i=0; i<8; i++){
            data[addr + i] = val >> (8 * i) & 0xFF;
            // 1个字节1个字节存储，小端序，所以每次要右移1个字节，即8位
        }
        return false;
    }
}

word_t Memory::readWord(addr_t addr, bool& error) const{
    if (addr > MAX_SIZE - 8) {
        error = true;
        return 0;
    }
    else {
        error = false;
        word_t value = 0;
        for (int i=0; i<8; i++){
            value |= static_cast<uint64_t>(data[addr + i]) << (8 * i);
            // 低地址取得低位，高地址取得高位，需要左移1个字节
            // 需要将 data[addr + i] (uint8_t) 强制类型转换为 uint64_t
            // 这牵扯到 C/C++ 的 整数提升规则 (Integral Promotion):
            // 所有小于 int 的整数类型，参与运算时都会先提升为 int
            // 因此如果左移位数超过32，未经过类型转换会出现问题
        }
        return value;
    }
}