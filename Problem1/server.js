import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 9876;
const MAX_WINDOW_SIZE = 10;
let recentNumbers = [];

const numberTypeMap = {
  'p': 'primes',
  'f': 'fibo',
  'e': 'even',
  'r': 'rand'
};

app.use(cors());
app.use(express.json());

app.get('/numbers/:typeId', async (req, res) => {
  const typeId = req.params.typeId;
  const numberCategory = numberTypeMap[typeId];

  if (!numberCategory) {
    return res.status(400).json({ error: "Invalid type ID provided." });
  }

  const apiEndpoint = `http://20.244.56.144/evaluation-service/${numberCategory}`;

  try {
    const result = await Promise.race([
      axios.get(apiEndpoint, {
        headers: {
          Authorization: `Bearer ${process.env.TOKEN}`
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject("Request timed out"), 500))
    ]);

    const fetchedNumbers = result.data.numbers || [];
    const previousState = [...recentNumbers];

    for (const number of fetchedNumbers) {
      if (!recentNumbers.includes(number)) {
        if (recentNumbers.length >= MAX_WINDOW_SIZE) {
          recentNumbers.shift();
        }
        recentNumbers.push(number);
      }
    }

    const currentAvg = recentNumbers.length > 0
      ? parseFloat((recentNumbers.reduce((sum, val) => sum + val, 0) / recentNumbers.length).toFixed(2))
      : 0.00;

    res.json({
      previousWindow: previousState,
      currentWindow: [...recentNumbers],
      received: fetchedNumbers,
      average: currentAvg
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data", details: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`✔️ Backend running on http://localhost:${PORT}`);
});
