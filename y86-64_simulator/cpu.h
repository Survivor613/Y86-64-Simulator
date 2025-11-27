class Simulator
{
public:
    Simulator();

    void loadProgram();

    int fetch();

    int decode();

    void execute();

    void run();

private:
    int PC = 0;
};