import mammoth from "mammoth";
import chalk from "chalk";
import fs from "fs";
import path from "path";

type Option = { text: string; isCorrect: boolean };
type Question = { question: string; options: Option[] };

/**
 * Parses a .docx file to extract questions and their corresponding options.
 * Each question is identified by its number, followed by the question text
 * ending with a `?` or `:`, and a list of options.
 *
 * @param {string} filePath - The path to the .docx file to be parsed.
 * @returns {Promise<Question[]>} - A promise that resolves to an array of extracted Question objects.
 * Each question contains its text and a list of options with correctness flags.
 *
 * @throws {Error} If the file cannot be read or parsed.
 */

async function parseFile(filePath: string): Promise<Question[]> {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value.split("\n");
  const questions: Question[] = [];

  lines.forEach((line) => {
    // Kiểm tra xem dòng có chứa câu hỏi và đáp án không
    const match = line.match(/^(\d+\.)\s+(.*?[?:])\s*(A\..*)$/);
    if (match) {
      const questionText = `${match[1]} ${match[2].trim()}`;
      const optionsText = match[3];

      // Tách các đáp án
      const options = optionsText
        .split(/(?=[A-Z]\.)/)
        .map((option) => {
          const optionMatch = option.match(/^([A-Z])\.\s*(.*?)([;=]?)\s*$/);
          if (optionMatch) {
            const text = `${optionMatch[1]}. ${optionMatch[2].trim()}`;
            const isCorrect = optionMatch[3] === "=";
            return { text, isCorrect };
          }
          return null;
        })
        .filter(Boolean) as Option[];

      // Thêm câu hỏi vào danh sách
      questions.push({ question: questionText, options });
    }
  });

  if (questions.length === 0) {
    console.warn(`No valid questions found in ${filePath}.`);
  }

  return questions;
}

/**
 * Compares user-provided answers against correct answers and logs the results.
 * For each question, checks if the answers match, are incorrect, or are unanswered.
 *
 * @param {Question[]} file1 - Array of Question objects representing correct answers.
 * @param {Question[]} file2 - Array of Question objects representing user-provided answers.
 * @param {boolean} suppressUnansweredLog - If true, suppresses logs for unanswered questions.
 *
 * @returns {void}
 */
function compareAnswers(
  file1: Question[],
  file2: Question[],
  suppressUnansweredLog: boolean
): void {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const questionMap = new Map(file2.map((q) => [q.question.split(" ")[0], q]));
  file1.forEach((q1, index) => {
    const q2 = questionMap.get(q1.question.split(" ")[0]);
    const correctAnswerTexts = getCorrectAnswerTexts(q1);

    if (!q2) {
      // Handle missing question in file2
      unanswered++;
      console.log(
        chalk.yellow(
          `[!] No corresponding answer found for question:\n${q1.question}\n`
        )
      );
      return; // Skip to the next question
    }

    const userAnswerTexts = q2 ? getCorrectAnswerTexts(q2) : [];

    if (userAnswerTexts.length === 0) {
      unanswered++;
      if (!suppressUnansweredLog) {
        // Log only if suppressUnansweredLog is false
        console.log(
          chalk.cyan(
            `[U] Unanswered question:\n${q2.question}\n${q2.options
              .map((opt, i) => `${opt.text};`)
              .join("\n")}\n`
          )
        );
      }
    } else if (
      JSON.stringify(correctAnswerTexts.map((a) => a.toLowerCase()).sort()) ===
      JSON.stringify(userAnswerTexts.map((a) => a.toLowerCase()).sort())
    ) {
      correct++;
    } else {
      incorrect++;
      console.log(
        chalk.red(
          `[X] Incorrect question:\n${q1.question}\n` +
            `- Your answers:\n` +
            userAnswerTexts.map((answer) => `  + ${answer}`).join("\n") +
            `\n`
        ) +
          chalk.green(
            `- Correct answers:\n` +
              correctAnswerTexts.map((answer) => `  + ${answer}`).join("\n") +
              `\n`
          )
      );
    }
  });

  const totalQuestions = correct + incorrect + unanswered;
  const correctPercentage =
    totalQuestions === 0 ? 0 : (correct / totalQuestions) * 100;

  const questionResults = {
    "Total questions": { Count: totalQuestions },
    Correct: { Count: correct },
    Incorrect: { Count: incorrect },
    Unanswered: { Count: unanswered },
    "Correct percentage": { Count: `${correctPercentage.toFixed(1)}%` },
  };

  console.log(`\nSummary:`);
  console.table(questionResults);
}

/**
 * Main function to run the script for comparing answers.
 * - Validates the provided directory path.
 * - Ensures the presence of required files (`questions.docx` and `answers.docx`).
 * - Parses the files to extract questions and answers.
 * - Compares the answers and logs results.
 *
 * Command-line arguments:
 * - `directory=<path>`: Path to the folder containing the `.docx` files.
 * - `nolog=unanswered`: Suppress logging of unanswered questions.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    displayUsage();
    process.exit(0);
  }

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
  } catch (error: string | any) {
    console.error("An error occurred:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

/**
 * Displays usage instructions for the script.
 * Provides details about required and optional arguments and usage examples.
 *
 * @returns {void}
 */

function displayUsage() {
  console.log(
    `========================================================================================`
  );
  console.log("Usage:");
  console.log(
    `  directory="path/to/your/directory"   Specify folder containing questions and answers.`
  );
  console.log("  nolog=unanswered   Suppress logging of unanswered questions.");
  console.log(
    "========================================================================================="
  );
  console.log("Examples:");
  console.log(
    `  npm run dev directory="path/to/your/directory" nolog=unanswered`
  );
  console.log(
    "========================================================================================="
  );
}

/**
 * Retrieves the text of correct options for a given question.
 *
 * @param {Question} question - A question object containing options.
 * @returns {string[]} - An array of text for all correct options.
 */
function getCorrectAnswerTexts(question: Question): string[] {
  return question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.text);
}

main().catch(console.error);
