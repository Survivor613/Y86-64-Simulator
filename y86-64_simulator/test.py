import os
import shutil

import json
import argparse
import subprocess
import difflib
import pprint

def main():
    args = parse_args()
    os.makedirs('temp_answer', exist_ok=True)
    for filename in os.listdir('test'):
        testname = filename.split('.')[0]
        try:
            # import ipdb; ipdb.set_trace()
            subprocess.run(args.bin.split(" "), stdin=open(f"test/{filename}"), stdout=open(f"temp_answer/{testname}.json", 'w'), timeout=1)
        except Exception as e:
            print(f"Execution failed: {e}")
            return

    def try_read(file):
        # try to read it as json, if failed, try to read it as yaml
        try:
            with open(file) as f:
                return json.load(f)
        except:
            pass
            
    res = {file: try_read(f"temp_answer/{file}") for file in os.listdir('temp_answer')}
    answer = {file: try_read(f"answer/{file}") for file in os.listdir('answer')}

    if not args.save_mid:
        shutil.rmtree('temp_answer')

    def transform_mem(states):
        try:
            for state in states:
                state['MEM'] = {str(k): v for k, v in state['MEM'].items()}
        except Exception as e:
            print(f"Parse Error {e}, your answer: ")
            pprint.pprint(states)
            print("Traceback:")
            raise e
        return states
        
    for filename, content in res.items():
        rc = transform_mem(content)
        ra = transform_mem(answer[filename])
        if rc != ra:
            print(f"Wrong answer for {filename}")
            print(f"Your answer: \n{rc}")
            print(f"Correct answer: \n{ra}")
            print("Diff:")
            print(diff_strings(pprint.pformat(rc), pprint.pformat(ra)))
            return
    print("All correct!")

# https://gist.github.com/ines/04b47597eb9d011ade5e77a068389521
def diff_strings(a: str, b: str, *, use_loguru_colors: bool = False) -> str:
    output = []
    matcher = difflib.SequenceMatcher(None, a, b)
    if use_loguru_colors:
        green = '<GREEN><black>'
        red = '<RED><black>'
        endgreen = '</black></GREEN>'
        endred = '</black></RED>'
    else:
        green = '\x1b[38;5;16;48;5;2m'
        red = '\x1b[38;5;16;48;5;1m'
        endgreen = '\x1b[0m'
        endred = '\x1b[0m'

    for opcode, a0, a1, b0, b1 in matcher.get_opcodes():
        if opcode == 'equal':
            output.append(a[a0:a1])
        elif opcode == 'insert':
            output.append(f'{green}{b[b0:b1]}{endgreen}')
        elif opcode == 'delete':
            output.append(f'{red}{a[a0:a1]}{endred}')
        elif opcode == 'replace':
            output.append(f'{green}{b[b0:b1]}{endgreen}')
            output.append(f'{red}{a[a0:a1]}{endred}')
    return ''.join(output)

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bin', type=str, help='path to the executable file',required=True)
    parse_args
    parser.add_argument('--save_mid',action='store_true',help='save the intermediate files')
    return parser.parse_args()
                
if __name__ == "__main__":
    main()