import json

# THESE ARE LAYER 2 ERRORS: Complex logic and memory issues that AI handles best.
AI_ERRORS = [
    {
        "type": "integer_division",
        "code": "int main() {\n    float result = 5 / 2;\n    printf(\"%f\", result);\n    return 0;\n}",
        "hints": {
            "FOCUS": {
                1: "Check the data types in your division.",
                2: "Dividing two integers in C always results in an integer.",
                3: "Change '5 / 2' to '5.0 / 2.0' to get a float result."
            },
            "OVERLOAD": {
                1: "The division on line 2 isn't giving you a decimal.",
                2: "Because 5 and 2 are integers, C throws away the .5.",
                3: "Let's force it to be a decimal. Write 'float result = 5.0 / 2.0;' instead."
            },
            "CONFUSE": {
                1: "In C, if you divide whole numbers, the answer is a whole number.",
                2: "Even though 'result' is a float, the math '5 / 2' happens first and cuts off the decimal.",
                3: "To fix integer division truncation, make at least one number a float: '5.0 / 2'."
            }
        }
    },
    {
        "type": "uninitialized_pointer",
        "code": "int main() {\n    int *ptr;\n    *ptr = 10;\n    return 0;\n}",
        "hints": {
            "FOCUS": {
                1: "Where is 'ptr' pointing to?",
                2: "You are dereferencing a pointer that hasn't been assigned an address.",
                3: "Point 'ptr' to a valid variable's address before assigning 10."
            },
            "OVERLOAD": {
                1: "Your pointer 'ptr' doesn't have a home yet.",
                2: "You can't put the value 10 into a pointer that isn't pointing anywhere.",
                3: "Make an integer variable first, then point 'ptr' to it using '&'."
            },
            "CONFUSE": {
                1: "A pointer only holds memory addresses, not actual numbers.",
                2: "By writing '*ptr = 10', you are trying to write to a random, unallocated piece of memory (SegFault).",
                3: "First, create 'int x;'. Then point the pointer: 'ptr = &x;'. Finally, '*ptr = 10;'."
            }
        }
    },
    {
        "type": "switch_missing_break",
        "code": "switch(x) {\n    case 1:\n        printf(\"One\");\n    case 2:\n        printf(\"Two\");\n}",
        "hints": {
            "FOCUS": {
                1: "What happens after 'case 1' executes?",
                2: "Your switch statement is 'falling through' to the next case.",
                3: "Add a 'break;' statement at the end of case 1."
            },
            "OVERLOAD": {
                1: "If x is 1, it prints 'One' AND 'Two'.",
                2: "Switch cases in C don't stop automatically.",
                3: "Put the word 'break;' on a new line right after printf(\"One\");"
            },
            "CONFUSE": {
                1: "Switch statements are like a waterfall. Once they start, they keep falling through the cases below.",
                2: "To stop the waterfall after case 1, you have to explicitly tell C to break out of the switch.",
                3: "Add 'break;' after your printf statements so it only executes the matching case."
            }
        }
    },
    {
        "type": "infinite_loop",
        "code": "for (int i = 0; i < 10; i--) {\n    printf(\"%d\", i);\n}",
        "hints": {
            "FOCUS": {
                1: "Check your loop condition and update step.",
                2: "Will 'i' ever reach 10?",
                3: "Change 'i--' to 'i++'."
            },
            "OVERLOAD": {
                1: "Your loop is running forever.",
                2: "'i' starts at 0 and goes down (-1, -2...). It will always be less than 10.",
                3: "Change the 'i--' to 'i++' so the number actually goes up."
            },
            "CONFUSE": {
                1: "A for-loop stops when the condition in the middle becomes false.",
                2: "Because you are subtracting (i--), 'i' gets further and further away from 10.",
                3: "To make the loop count up to 10 and stop, use the increment operator: 'i++'."
            }
        }
    },
    {
        "type": "string_literal_mutation",
        "code": "int main() {\n    char *str = \"hello\";\n    str[0] = 'H';\n    return 0;\n}",
        "hints": {
            "FOCUS": {
                1: "Are string literals mutable in C?",
                2: "You are trying to change read-only memory.",
                3: "Declare 'str' as an array: char str[] = \"hello\";"
            },
            "OVERLOAD": {
                1: "You can't change the letters in this specific type of string.",
                2: "Using a pointer (*str) for text makes it read-only.",
                3: "Change 'char *str' to 'char str[]' to make it an editable array."
            },
            "CONFUSE": {
                1: "In C, text declared with a pointer (*str) is stored in a locked part of memory.",
                2: "When you try to change 'h' to 'H', the program crashes because the memory is read-only.",
                3: "By using an array (char str[]), C copies the text into your own editable memory."
            }
        }
    },
    {
        "type": "array_out_of_bounds",
        "code": "int arr[5] = {1, 2, 3, 4, 5};\nprintf(\"%d\", arr[5]);",
        "hints": {
            "FOCUS": {
                1: "Check your array index.",
                2: "Arrays in C are zero-indexed. Is there an arr[5]?",
                3: "The last element is arr[4]. Change your print statement."
            },
            "OVERLOAD": {
                1: "You are trying to read past the end of the array.",
                2: "An array of size 5 only has spots 0, 1, 2, 3, and 4.",
                3: "To print the last number, change 'arr[5]' to 'arr[4]'."
            },
            "CONFUSE": {
                1: "C starts counting array slots at 0, not 1.",
                2: "If you have 5 items, their addresses are 0, 1, 2, 3, and 4. Slot 5 doesn't exist.",
                3: "Asking for arr[5] reads random garbage memory. Change it to arr[4]."
            }
        }
    },
    {
        "type": "dangling_pointer",
        "code": "int* getNum() {\n    int x = 5;\n    return &x;\n}",
        "hints": {
            "FOCUS": {
                1: "What happens to 'x' when the function ends?",
                2: "You are returning the address of a local variable.",
                3: "Allocate memory dynamically with malloc, or pass a pointer in as an argument."
            },
            "OVERLOAD": {
                1: "The variable 'x' gets destroyed when the function finishes.",
                2: "You are sending back a pointer to memory that no longer exists.",
                3: "To fix this, you must use 'malloc' to keep the memory alive."
            },
            "CONFUSE": {
                1: "Local variables (like x) only live inside the curly braces where they are created.",
                2: "When getNum() finishes, 'x' is deleted. Returning '&x' gives you a 'dangling pointer'.",
                3: "You need memory that survives the function. Use 'int *x = malloc(sizeof(int));'."
            }
        }
    },
    {
        "type": "scanf_array_ampersand",
        "code": "char name[50];\nscanf(\"%s\", &name);",
        "hints": {
            "FOCUS": {
                1: "How does C handle array names?",
                2: "An array name is already a pointer to its first element.",
                3: "Remove the '&' before 'name' in your scanf."
            },
            "OVERLOAD": {
                1: "You don't need the '&' for strings.",
                2: "Because 'name' is an array, it already acts like a memory address.",
                3: "Change it to: scanf(\"%s\", name);"
            },
            "CONFUSE": {
                1: "Normally, scanf needs an '&' to find where a variable lives in memory.",
                2: "However, in C, the name of an array automatically points to its memory address.",
                3: "Using '&name' creates a pointer to a pointer, which causes bugs. Just use 'name'."
            }
        }
    },
    {
        "type": "logical_and_vs_bitwise",
        "code": "if (x > 5 & x < 10) {\n    printf(\"Valid\");\n}",
        "hints": {
            "FOCUS": {
                1: "Check your AND operator.",
                2: "Are you trying to do a bitwise operation or a logical comparison?",
                3: "Use '&&' for logical AND comparisons."
            },
            "OVERLOAD": {
                1: "A single '&' is for advanced math (bitwise), not logic.",
                2: "To say 'this AND that', you need two ampersands.",
                3: "Change the '&' in your if-statement to '&&'."
            },
            "CONFUSE": {
                1: "In C, '&' compares numbers at the binary level (1s and 0s).",
                2: "To check if two conditions are both true, you must use the logical AND operator.",
                3: "Replace the single '&' with '&&' to correctly connect your two conditions."
            }
        }
    },
    {
        "type": "missing_return_in_non_void",
        "code": "int calculateSum(int a, int b) {\n    int sum = a + b;\n}",
        "hints": {
            "FOCUS": {
                1: "What is this function supposed to give back?",
                2: "The function signature says 'int', but nothing is returned.",
                3: "Add 'return sum;' at the end of the function."
            },
            "OVERLOAD": {
                1: "Your function does the math, but doesn't hand the answer back.",
                2: "Because it starts with 'int', it must output an integer.",
                3: "Put 'return sum;' right before the closing curly brace."
            },
            "CONFUSE": {
                1: "When you declare 'int calculateSum', you are promising the compiler you will hand back an integer.",
                2: "Right now, the math happens, but the answer is trapped inside the function.",
                3: "Use the 'return' keyword to send the value of 'sum' back to wherever the function was called."
            }
        }
    }
]

dataset = []

# Generate the formatted dataset
for error in AI_ERRORS:
    for state in ["FOCUS", "OVERLOAD", "CONFUSE"]:
        for attempt in [1, 2, 3]:
            
            input_text = f"Student Code:\n{error['code']}\n\nCognitive State: {state}\nAttempt Number: {attempt}"
            output_text = error['hints'][state][attempt]
            
            dataset.append({
                "instruction": "You are an empathetic and expert C programming tutor. Analyze the student's code, cognitive state, and attempt number to provide a tailored, highly specific hint.",
                "input": input_text,
                "output": output_text
            })

# Save to a JSON file
with open("training_data.json", "w") as f:
    json.dump(dataset, f, indent=4)

print(f"✅ Generated {len(dataset)} high-quality training examples and saved to training_data.json!")