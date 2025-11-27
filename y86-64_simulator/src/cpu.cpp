#include "../include/global.h"
#include "../include/register.h"
#include "../include/memory.h"
#include "../include/loader.h"
#include "../include/cpu.h"

// CHECK_ERR 宏的辅助函数
inline bool setAddrError(Stat &stat) {
    stat = Stat::ADR;
    return false;
}

// do {...} while (0) 是宏安全标准的封装格式
// 用于简便的检查错误
// 避免每次都写 if (error == 1) { stat = Stat::ADR; return false; }
#define CHECK_ERR(error, stat) \
    do {                        \
        if (error)              \
            return setAddrError(stat); \
    } while (0)



// 正式类函数定义的开始
CPU::CPU(Memory& memory) : mem(memory) {}

void CPU::reset(){
    reg.reset();
    cc = { true, false, false };
    PC = 0;
    stat = Stat::AOK;
}

bool CPU::fetch(){
    // 取得 icode & ifunc
    bool error;
    byte_t b0 = mem.readByte(PC, error);
    CHECK_ERR(error, stat);

    icode = (b0 >> 4) & 0xF;
    ifunc = b0 & 0xF;

    valP = PC + 1; // 读取 icode & ifunc 后更新 valP 位置

    // 判断类型，执行对应操作

    // 特殊情况 (不需额外读取字节)
    if (icode == ICode::HALT){
        stat = Stat::HLT;
        valP = PC;
        return true;
    }

    // 其他情况:
    // 判断需要读取多少字节
    bool needReg = (icode == ICode::RRMOVQ
                || icode == ICode::IRMOVQ
                || icode == ICode::RMMOVQ
                || icode == ICode::MRMOVQ
                || icode == ICode::OPQ
                || icode == ICode::PUSHQ
                || icode == ICode::POPQ);

    bool needValC = (icode == ICode::IRMOVQ
                || icode == ICode::MRMOVQ
                || icode == ICode::RMMOVQ
                || icode == ICode::JXX
                || icode == ICode::CALL);

    if (needReg){
        byte_t b1 = mem.readByte(valP, error);
        CHECK_ERR(error, stat);

        rA = static_cast<Reg::ID>((b1 >> 4) & 0xF);
        rB = static_cast<Reg::ID>(b1 & 0xF);

        valP += 1;  // 读取 rA & rB 后更新 valP 位置
    }
    else{
        rA = Reg::NONE;
        rB = Reg::NONE;
    }

    if (needValC){
        valC = mem.readWord(valP, error);
        CHECK_ERR(error, stat);

        valP += 8;  // 读取 valC 后更新 valP 位置
    }


    return true;
}

bool CPU::decode(){
    Reg::ID srcA = Reg::NONE;
    Reg::ID srcB = Reg::NONE;

    if (icode == ICode::HALT
        || icode == ICode::NOP
        || icode == ICode::RRMOVQ
        || icode == ICode::IRMOVQ
        || icode == ICode::RMMOVQ
        || icode == ICode::MRMOVQ
        || icode == ICode::OPQ
    ){
        srcA = rA;
        srcB = rB;
    }
    else if (icode == ICode::PUSHQ
        || icode == ICode::POPQ
        || icode == ICode::CALL
        || icode == ICode::RET){
        srcA = rA;          // CALL 不需要 rA, 但这里为了简便服用这个逻辑
        srcB = Reg::RSP;    // reg[4] = rsp
    }

    valA = reg.getReg(srcA);
    valB = reg.getReg(srcB);


    return true;
}

// execute阶段辅助函数
void CPU::setALU(word_t& aluA, word_t& aluB, ALU::Op& op)
{
    switch (icode){
    case ICode::RRMOVQ:
        aluA = valA;
        aluB = 0;
        break;
    case ICode::IRMOVQ:
        aluA = valC;
        aluB = 0;
        break;
    case ICode::RMMOVQ:
        aluA = valC;
        aluB = valB;
        break;
    case ICode::MRMOVQ:
        aluA = valC;
        aluB = valB;
        break;
    case ICode::OPQ:
        aluA = valA;
        aluB = valB;
        op = static_cast<ALU::Op>(ifunc);
        break;
    case ICode::PUSHQ:
        aluA = -8;
        aluB = valB;  // rsp
        break;
    case ICode::POPQ:
        aluA = 8;
        aluB = valB;  // rsp
        break;
    case ICode::CALL:
        aluA = -8;
        aluB = valB;  // rsp
        break;
    case ICode::RET:
        aluA = 8;
        aluB = valB;  // rsp
        break;
    default:
        aluA = 0;
        aluB = 0;
        break;
    }
}

// execute阶段辅助函数
word_t CPU::execALU(const word_t& aluA, const word_t& aluB, const ALU::Op& op){
    int64_t a = (int64_t)aluA;
    int64_t b = (int64_t)aluB;
    int64_t r;
    switch (op){
        case ALU::ADD:
            r = b + a;
            break;
        case ALU::SUB:
            r = b - a;
            break;
        case ALU::AND:
            r = b & a;
            break;
        case ALU::XOR:
            r = b ^ a;
            break;
        default:
            std::cout << "ALU报错";
            r = 0;
            break;
    }

    return (word_t)r;
}

// execute阶段辅助函数
void CPU::setCC(word_t& aluA, word_t& aluB, ALU::Op& op){
    int64_t a = (int64_t)aluA;
    int64_t b = (int64_t)aluB;
    int64_t e = (int64_t)valE;

    // Zero & Sign
    cc.zf = (e == 0);
    cc.sf = (e < 0);

    switch (op){
        case ALU::ADD:
            // b + a 溢出：
            cc.of = ((a > 0 && b > 0 && e < 0) ||
                     (a < 0 && b < 0 && e > 0));
            break;
        case ALU::SUB:
            // b - a 溢出：  (注意永远是 b Op a , 顺序不要搞反!!!)
            cc.of = ((a < 0 && b > 0 && e < 0) ||
                     (a > 0 && b < 0 && e > 0));
            break;
        case ALU::AND:      // 利用 fall through
        case ALU::XOR:
            cc.of = false;
            break;
        default:
            std::cout << "setCC报错";
            break;
    }
}

bool CPU::execute(){
    // 特殊情况: 不需要执行 ALU , 如 JXX
    if (icode == ICode::JXX) return true;

    // 初始化
    word_t aluA = 0, aluB = 0;
    ALU::Op op = ALU::ADD;

    setALU(aluA, aluB, op); // 设置 aluA, aluB, op
    valE = execALU(aluA, aluB, op);  // ALU模块
    if (icode == ICode::OPQ) { setCC(aluA, aluB, op); } // 设置 cc (Condition Code)


    return true;
}

bool CPU::memory_stage() {
    bool error = false;

    switch (icode) {
        case ICode::RMMOVQ:
            // M[valE] ← valA
            if (mem.writeWord(valE, valA))
                return false;
            break;
        case ICode::MRMOVQ:
            // valM ← M[valE]
            valM = mem.readWord(valE, error);
            CHECK_ERR(error, stat);
            break;
        case ICode::PUSHQ:
            // M[valE] ← valA  (valE = rsp - 8)
            if (mem.writeWord(valE, valA))
                return setAddrError(stat);
            break;
        case ICode::POPQ:
            // valM ← M[valB]  (valB = old rsp)
            valM = mem.readWord(valB, error);
            CHECK_ERR(error, stat);
            break;
        case ICode::CALL:
            // M[valE] ← valP  (return address)
            if (mem.writeWord(valE, valP))
                return setAddrError(stat);
            break;
        case ICode::RET:
            // valM ← M[valB]  (valB = rsp)
            valM = mem.readWord(valB, error);
            CHECK_ERR(error, stat);
            break;
        default:
            break;
    }

    return true;
}

// writeback阶段辅助函数
bool CPU::cond(){
    switch (static_cast<Cond::Type>(ifunc)){
        // bool类型实则占1byte，而非1bit
        // 故需要用 !,!=,||,&& 取代 ~,^,|,&
        case Cond::None:
            return true;
        case Cond::LE:
            return (cc.sf != cc.of) || cc.zf;
        case Cond::L:  // b < a
            return cc.sf != cc.of;
        case Cond::E:
            return cc.zf;
        case Cond::NE:
            return !cc.zf;
        case Cond::GE:
            return !(cc.sf != cc.of);
        case Cond::G:
            return !(cc.sf != cc.of) && !cc.zf;   // b > a
        default:
            std::cout << "条件是否满足判断出错";
            return false;
    }
}

bool CPU::writeback() {
    if (stat == Stat::INS || stat == Stat::HLT) return false;

    switch (icode) {
        case ICode::RRMOVQ:
            if (cond()) reg.setReg(rB, valE);      // cmovXX(包含rrmovq)
            break;
        case ICode::IRMOVQ:
        case ICode::OPQ:
            reg.setReg(rB, valE);
            break;
        case ICode::MRMOVQ:
            reg.setReg(rA, valM);
            break;
        case ICode::PUSHQ:
            reg.setReg(Reg::RSP, valE);
            break;
        case ICode::POPQ:
            reg.setReg(Reg::RSP, valE);
            reg.setReg(rA, valM);
            break;
        case ICode::CALL:
            reg.setReg(Reg::RSP, valE);
            break;
        case ICode::RET:
            reg.setReg(Reg::RSP, valE);
            break;
        default:
            break;
    }

    return true;
}

void CPU::updatePC() {
    if (stat != Stat::AOK) return;

    switch (icode) {
        case ICode::JXX:
            if (cond()) {
                PC = valC;
                return;
            }
            break;
        case ICode::CALL:
            PC = valC;
            return;
        case ICode::RET:
            PC = valM;
            return;
        default:
            break;
    }

    PC = valP;
}

void CPU::step(){
    if (stat == (Stat::AOK)){
        fetch();
        decode();
        execute();
        memory_stage();
        writeback();
        updatePC();
    }
}