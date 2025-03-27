"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
// import { SystemMessage, HumanMessage } from "@langchain/core/messages";
// import { ChatOpenAI } from "@langchain/openai";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { StringOutputParser } from "@langchain/core/output_parsers";
// const model = new ChatOpenAI();
// const askModel = async (input: string) => {
//   const prompt = ChatPromptTemplate.fromMessages([
//     new SystemMessage("You're a helpful assistant"),
//     new HumanMessage(input),
//   ]);
//   const parser = new StringOutputParser();
//   const chain = prompt.pipe(model).pipe(parser);
//   return await chain.invoke(input);
// };
// const chat = () => {
//   rl.question('Enter a command (type "exit" to quit): ', async (input) => {
//     if (input.toLowerCase() === "exit") {
//       console.log("Goodbye!");
//       rl.close();
//     } else {
//       const result = await askModel(input);
//       console.log(result);
//       chat();
//     }
//   });
// };
//# sourceMappingURL=index.js.map