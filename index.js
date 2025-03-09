// import {tool} from '@langchain/core/tools'
// import {z} from 'zod';
// import { ChatOpenAI } from '@langchain/openai';
// import{config} from 'dotenv'
// import { MessagesAnnotation,StateGraph } from '@langchain/langgraph';
// import { ToolMessage } from '@langchain/core/messages';

// config();

// const model = new ChatOpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
//     modelName: "gpt-4o",
//   });
//   const response = await model.invoke(new HumanMessage("Hello world!"));




// const multiply = tool(
//     async(({a, b}) => {
//         return a * b
//     }), {
//         name : 'multiply',
//         description : 'Multiply two numbers',
//         schema: z.object({ 
//             a: z.number().describe('First number'),
//             b: z.number().describe('Second number'),
//         }),
//     }
// );
// const add = tool(
//     async(({a, b}) => {
//         return a + b
//     }), {
//         name : 'multiply',
//         description : 'Multiply two numbers',
//         schema: z.object({ 
//             a: z.number().describe('First number'),
//             b: z.number().describe('Second number'),
//         }),
//     }
// );
// const divide = tool(
//     async(({a, b}) => {
//         return a / b
//     }), {
//         name : 'multiply',
//         description : 'Multiply two numbers',
//         schema: z.object({ 
//             a: z.number().describe('First number'),
//             b: z.number().describe('Second number'),
//         }),
//     }
// );

// const tools = {add , multiply, divide};
// const toolsByName = Object.fromEntries(Object.entries(tools).map(([name, tool]) => [tool.name, tool]));
// const llmWithTools = llm.blindTools(tools);


// async function llmCall(state) {
//     const result = await llmWithTools.invoke([
// {        role: 'system',
//         content : 
//         'you are a helpful assistant tasked with perfiorming arithmetic operations. You can add, subtract, multiply and divide numbers. Please provide the numbers and the operation you would like to perform',
//     },
//     ...state.messages,
//     ]);
// return {
//     messages:[result],
// };
// }


// async function toolNode(state) {
//     const result =[];
//     const lastMessage = state.messages[state.messages.length - 1];
    
//     if (lastMessage?.tool_calls?.length){
//             for (const toolCall of lastMessage. tool_calls) {
//             const tool = toolsByName [toolCall.name] ;
//             const observation = await tool. invoke(toolCall.args);
//            results. push(
//             new ToolMessage({
//                 content: observation,
//                 tool_call_id: toolCall.id,
//     }));
// }}}

// function shouldContinue(state) {
//     const messages = state.messages;
//     const lastMessage = messages.at(-1);
  
//     // If the LLM makes a tool call, then perform an action
//     if (lastMessage?.tool_calls?.length) {
//       return "Action";
//     }
//     // Otherwise, we stop (reply to the user)
//     return "__end__";
//   }

//   const agentBuilder = new StateGraph(MessagesAnnotation)
//   .addNode("llmCall", llmCall)
//   .addNode("tools", toolNode)
//   .addEdge("__start__", "llmCall")
//   .addConditionalEdges(
//     "llmCall",
//     shouldContinue,
//     {
//       // Name returned by shouldContinue : Name of next node to visit
//       "Action": "tools",
//       "__end__": "__end__",
//     }
//   )
//   .addEdge("tools", "llmCall")
//   .compile();

  
//   const messages = [{
//     role: "user",
//     content: "Add 3 and 4."
//   }];
//   const result = await agentBuilder.invoke({ messages });
//   console.log(result.messages);

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "dotenv";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";

config();

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-3.5-turbo",
});

const add = tool(
  async ({ a, b }) => a + b,
  {
    name: "add",
    description: "Add two numbers",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const multiply = tool(
  async ({ a, b }) => a * b,
  {
    name: "multiply",
    description: "Multiply two numbers",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const divide = tool(
  async ({ a, b }) => a / b,
  {
    name: "divide",
    description: "Divide two numbers",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);

const tools = { add, multiply, divide };
const toolsByName = Object.fromEntries(
  Object.entries(tools).map(([name, tool]) => [tool.name, tool])
);
const llmWithTools = model.bindTools(Object.values(tools));

async function llmCall(state) {
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant tasked with performing arithmetic operations. You can add, subtract, multiply, and divide numbers. Please provide the numbers and the operation you would like to perform",
    },
    ...state.messages,
  ]);
  return {
    messages: [result],
  };
}

async function toolNode(state) {
  const results = [];
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage?.tool_calls?.length) {
    for (const toolCall of lastMessage.tool_calls) {
      const tool = toolsByName[toolCall.name];
      const observation = await tool.invoke(toolCall.args);
      results.push(
        new ToolMessage({
          content: observation,
          tool_call_id: toolCall.id,
        })
      );
    }
  }

  return { messages: results };
}

function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  return "__end__";
}

const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, {
    Action: "tools",
    __end__: "__end__",
  })
  .addEdge("tools", "llmCall")
  .compile();

async function main() {
  const messages = [
    {
      role: "user",
      content: "Add 3 and 4.",
    },
  ];
  const result = await agentBuilder.invoke({ messages });
  console.log(result.messages);
}

main();
