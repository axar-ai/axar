# Running the examples

## Prerequisites
- Node.js (v18 or higher)
- npm (comes with Node.js)
- OpenAI API key

## Setup & Running
1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY='your_api_key'
   ```

4. Run the examples with `npx ts-node <example-file>.ts`:
   ```bash
   npx ts-node examples/simple-agent.ts
   ```