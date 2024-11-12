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

👨‍💻 Created by khoahocmai.
