import chalk from "chalk";

export const logger = {
  title(message: string) {
    console.log(chalk.bold.cyan(`\n${message}\n`));
  },
  info(message: string) {
    console.log(chalk.blue("i"), message);
  },
  success(message: string) {
    console.log(chalk.green("✓"), message);
  },
  warn(message: string) {
    console.log(chalk.yellow("!"), message);
  },
  error(message: string) {
    console.error(chalk.red("x"), message);
  },
  muted(message: string) {
    console.log(chalk.gray(message));
  },
  step(message: string) {
    console.log(chalk.bold(`\n${message}`));
  }
};

export function maskSecret(value: string | undefined): string {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
