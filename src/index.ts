import mammoth from "mammoth";
import chalk from "chalk";
import fs from "fs";
import path from "path";

type Option = { text: string; isCorrect: boolean };
type Question = { question: string; options: Option[] };

async function parseFile(filePath: string): Promise<Question[]> {
  const result = await mammoth.extractRawText({ path: filePath }); // Use Mammoth to extract raw text from .docx file
  const lines = result.value.split("\n"); // Split content into lines based on newline character
  const questions: Question[] = []; // Array to store the list of questions

  lines.forEach((line) => {
    // Iterate through each line in the file
    const questionMatch = line.match(/^(\d+\.)\s+(.*?[?:])\s*(A\..*)$/); // Example: "1. Question text? A. Option1; B. Option2;"
    if (questionMatch) {
      // Separate questions and answers
      const questionText = `${questionMatch[1]} ${questionMatch[2].trim()}`; // "1. Question text?"
      const optionsText = questionMatch[3]; // "A. Option1; B. Option2;"

      // Find all answers, including true/false information
      const optionsMatch = optionsText.match(/[A-Z]\.\s.*?;\[\*\](\s*=?)/g);
      if (optionsMatch) {
        // Process each answer and mark it as true/false
        const options = optionsMatch
          .map((option) => {
            const optionMatch = option.match(
              /^([A-Z])\.\s*(.*?)\s*;\[\*\](\s*=?)?$/
            ); // Use regex to separate the text and true/false status of each
            if (optionMatch) {
              // optionMatch[1]: Answer character (A, B, C, ...)
              // optionMatch[2]: Answer content
              // optionMatch[3]: "=" status (if true)
              const text = `${optionMatch[1]}. ${optionMatch[2].trim()}`; // Format the answer
              const isCorrect = /\=\s*$/.test(option); // Check if the answer is correct

              // Update the answer syntax
              const updatedText = isCorrect ? `${text} ;[*] =` : `${text} ;[*]`;

              return { text: updatedText, isCorrect };
            }
            return null; // Return null if the regex does not match
          })
          .filter(Boolean) as Option[]; // Remove null elements

        // Add questions (including answers) to the questions list
        questions.push({ question: questionText, options });
      }
    }
  });

  if (questions.length === 0) {
    console.warn(`No valid questions found in ${filePath}.`);
  }

  return questions;
}

function compareAnswers(
  file1: Question[],
  file2: Question[],
  suppressUnansweredLog: boolean
): void {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const cleanText = (text: string) => text.replace(/\s*;\[\*\]\s*=?/, "");

  const questionMap = new Map(file2.map((q) => [q.question.split(" ")[0], q]));
  file1.forEach((q1, index) => {
    const q2 = questionMap.get(q1.question.split(" ")[0]);
    const correctAnswerTexts = getCorrectAnswerTexts(q1).map(cleanText);

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

    const userAnswerTexts = q2 ? getCorrectAnswerTexts(q2).map(cleanText) : [];

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

function getCorrectAnswerTexts(question: Question): string[] {
  return question.options
    .filter((option) => option.isCorrect)
    .map((option) => option.text);
}

main().catch(console.error);
