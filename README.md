# doc-quiz-checker

A Node.js utility for parsing and comparing questions and answers from two `.docx` files (e.g., `questions.docx` and `answers.docx`). This tool extracts questions and their options from the files, then checks for correctness by comparing the answers in each file.

## Features
- Parses `.docx` files for questions and multiple-choice answers.
- Marks answers as correct, incorrect, or unanswered.
- Summarizes the results.

## Prerequisites
- Node.js (version 14 or higher)
- `.docx` files with questions and answers stored in the same folder.

## Installation
1. Clone this repository:
    ```bash
    git clone https://github.com/khoahocmai/doc-quiz-checker.git
    cd doc-quiz-checker
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

## Format
1. Question: Each question should start with a number (e.g., '1. ','2. ') followed by the question text, ending with a '?' or ':'.
2. Answer:
    - Each answer option begins with a capital letter (A., B., C., D., ..., Z.), followed by the answer text, ending with a ';'.
    - Ensure that all answer choices are aligned and listed directly below the question.
3. Choose an answer:
    - Make sure the selected answer has a '; =' at the end of the sentence
    - Unselected answers will have a ';' at the end of the sentence.
  
## Example:
```vbnet
1. What is the capital of France?
A. Berlin;
B. Madrid;
C. Paris; =
D. Rome;
```

## Usage
1. Ensure that you have two `.docx` files:
   - `questions.docx` (contains the questions and correct answers)
   - `answers.docx` (contains the user's answers to be compared)

2. Place both files in the same directory.

3. Run the script with the directory path as an argument:
    ```bash
    npm run dev "path/to/your/directory"
    ```

## Output
- Total: ... question(s),
- Correct: ... question(s),
- Incorrect: ... question(s),
- Un-answered: ... question(s)

## Dependencies
- **mammoth**: For extracting raw text from `.docx` files.
- **chalk**: For coloring console output.

👨‍💻 [Created by khoahocmai](https://github.com/khoahocmai)
