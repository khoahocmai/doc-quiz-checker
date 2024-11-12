import mammoth from "mammoth";
import chalk from "chalk";
import fs from "fs";
import path from "path";

type Option = { text: string; isCorrect: boolean };
type Question = { question: string; options: Option[] };

/**
 * Parses a .docx file and extracts questions and options.
 * Each question and its options are identified based on specific patterns in the text.
 *
 * @param {string} filePath - The path to the .docx file to be parsed.
 * @returns {Promise<Question[]>} - A promise that resolves to an array of Question objects.
 */
async function parseFile(filePath: string): Promise<Question[]> {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value.split("\n");
  const questions: Question[] = [];
  let currentQuestion: Question | null = null;

  lines.forEach((line) => {
    // Check if line contains question and answers together
    const combinedMatch = line.match(/^(\d+\.)\s*(.*?[?:])\s*(A\..*)$/);
    if (combinedMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = { question: combinedMatch[2].trim(), options: [] };

      // Split answers after question
      const answers = combinedMatch[3].split(/(?=[A-D]\.)/);
      answers.forEach((answer) => {
        const optionMatch = answer.match(/^([A-D])\.\s*(.*?)([;=]?)\s*$/);
        if (optionMatch) {
          const text = optionMatch[2].trim();
          const isCorrect = optionMatch[3] === "=";
          currentQuestion?.options.push({ text, isCorrect });
        }
      });
    } else if (currentQuestion) {
      // Handle separate answer lines
      const optionMatch = line.match(/^([A-D])\.\s*(.*?)([;=]?)\s*$/);
      if (optionMatch) {
        const text = optionMatch[2].trim();
        const isCorrect = optionMatch[3] === "=";
        currentQuestion.options.push({ text, isCorrect });
      }
    }
  });

  // Add final question if present
  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
}

/**
 * Retrieves the correct answer texts from a question object.
 *
 * @param {Question} question - The question object to retrieve correct answers from.
 * @returns {string[]} - An array of correct answer texts.
 */
function getCorrectAnswerTexts(question: Question): string[] {
  return question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.text);
}

/**
 * Compares answers from two sets of questions and displays the results.
 * For each question, checks if the answers match, are incorrect, or unanswered.
 *
 * @param {Question[]} file1 - Array of Question objects representing the correct answers.
 * @param {Question[]} file2 - Array of Question objects representing the user's answers.
 */
function compareAnswers(
  file1: Question[],
  file2: Question[],
  suppressUnansweredLog: boolean
): void {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  file1.forEach((q1, index) => {
    const q2 = file2[index];
    const correctAnswerTexts = getCorrectAnswerTexts(q1);
    const userAnswerTexts = q2 ? getCorrectAnswerTexts(q2) : [];

    if (userAnswerTexts.length === 0) {
      unanswered++;
      if (!suppressUnansweredLog) {
        // Log only if suppressUnansweredLog is false
        console.log(
          chalk.yellow(
            `Unanswered question:\n${index + 1}. ${q2.question}\n${q2.options
              .map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt.text}`)
              .join("\n")}\n`
          )
        );
      }
    } else if (
      JSON.stringify(correctAnswerTexts.sort()) ===
      JSON.stringify(userAnswerTexts.sort())
    ) {
      correct++;
    } else {
      incorrect++;
      console.log(
        chalk.red(
          `Incorrect question:\n${index + 1}. ${
            q1.question
          }\nYour answers: ${userAnswerTexts.join(
            ", "
          )}\nCorrect answers: ${correctAnswerTexts.join(", ")}\n`
        )
      );
    }
  });

  const questionResults = {
    "Total questions": { Count: correct + incorrect + unanswered },
    Correct: { Count: correct },
    Incorrect: { Count: incorrect },
    Unanswered: { Count: unanswered },
  };

  console.log("Summary:");
  console.table(questionResults);
}

/**
 * The main function that drives the script.
 * It validates the provided folder path, checks for the presence of question and answer files,
 * parses both files, and then compares the answers.
 */
async function main() {
  const args = process.argv.slice(2);
  const folderPath = args
    .find((arg) => arg.startsWith("directory="))
    ?.split("=")[1];
  const suppressUnansweredLog = args.some((arg) => arg === "nolog=unanswered");
  if (!folderPath) {
    console.error("Please provide a folder path as an argument.");
    process.exit(1);
  }

  const resolvedFolderPath = path.resolve(folderPath);

  if (
    !fs.existsSync(resolvedFolderPath) ||
    !fs.statSync(resolvedFolderPath).isDirectory()
  ) {
    console.error(
      "The specified path is not a valid directory. The path must be in English and contain no spaces."
    );
    process.exit(1);
  }

  const questionFilePath = path.join(resolvedFolderPath, "questions.docx");
  const answerFilePath = path.join(resolvedFolderPath, "answers.docx");

  if (!fs.existsSync(questionFilePath) || !fs.existsSync(answerFilePath)) {
    console.error(
      "Both questions.docx and answers.docx files must be present in the folder."
    );
    process.exit(1);
  }

  try {
    const file1 = await parseFile(questionFilePath);
    const file2 = await parseFile(answerFilePath);
    compareAnswers(file1, file2, suppressUnansweredLog);
  } catch (error) {
    console.error("An error occurred while processing the files:", error);
  }
}

main().catch(console.error);
