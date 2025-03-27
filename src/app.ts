import express from 'express';
import bodyParser from 'body-parser';
import connectDB from './db/db-connection';
import roleRoute from './routes/role.route';
import cors from "cors"
import dotenv from 'dotenv'

dotenv.config();

import {DataAPIClient} from "@datastax/astra-db-ts"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { OpenAI  } from 'openai'
import {RecursiveCharacterTextSplitter} from "langchain/text_splitter"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"
const { 
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY
} = process.env

const openai = new OpenAI({apiKey: OPENAI_API_KEY})

const sctc_url = [
  "https://southernconvergence.com/",
  "https://southernconvergence.com/about",
  "https://southernconvergence.com/services/custom-software-development",
  "https://southernconvergence.com/services/tech-marketing-and-sales",
  "https://southernconvergence.com/services/tech-consulting",
  "https://southernconvergence.com/services/legacy-application-reengineering",
  "https://southernconvergence.com/services/onboarding-services-and-tech-ai-support",
  "https://southernconvergence.com/partners/datastax",
  "https://southernconvergence.com/partners/fastly",
  "https://southernconvergence.com/contact"
]

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT as string, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100
})

const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
  try {
    // Ensure ASTRA_DB_COLLECTION is defined
    if (!ASTRA_DB_COLLECTION) {
      throw new Error("ASTRA_DB_COLLECTION is undefined. Please provide a valid collection name.");
    }

    // Fetch the list of existing collections
    const collections = await db.listCollections();

    // Check if the collection exists by comparing collection names
    const collectionExists = collections.some(
      (col: { name: string }) => col.name === ASTRA_DB_COLLECTION
    );

    if (collectionExists) {
      console.log(`Collection '${ASTRA_DB_COLLECTION}' already exists. Skipping creation.`);
      return;
    }

    // Create the collection if it doesn't exist
    const res = await db.createCollection(ASTRA_DB_COLLECTION, {
      vector: {
        dimension: 1536,
        metric: similarityMetric,
      },
    });

    console.log("Collection created:", res);
  } catch (error) {
    console.error("Error while creating collection:", error);
  }
}

const loadSampleData = async () => {
  const collection = await db.collection(ASTRA_DB_COLLECTION as string)
  for await (const url of sctc_url) {
    const content = await scrapePage(url)
    const chunks = await splitter.splitText(content)
    for await (const chunk of chunks){
      const embedding = await openai.embeddings.create({
        model : "text-embedding-3-small",
        input : chunk,
        encoding_format: "float"
      })

      const vector = embedding.data[0].embedding

      const res = await collection.insertOne({
        $vector: vector,
        text: chunk
      })
      console.log(res)
    }
  }
}

const scrapePage = async (url: string) => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true
    },
    gotoOptions: {
      waitUntil: "domcontentloaded"
    },
    evaluate: async (page, browser) =>  {
      const result = await page.evaluate(() => document.body.innerHTML)
      await browser.close()
      return result
    }
  })

  return ( await loader.scrape())?.replace(/<[^>]*>?/gm, '')
}
const app = express();
const PORT = process.env.PORT || 5000;

connectDB();
createCollection().then(() => loadSampleData()).then(() => {
  console.log("Loaded sample data")
}).catch((error) => {
  console.error(error);
});
// Middleware
app.use(bodyParser.json()); // Parse JSON bodies
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use(cors())
app.use('/', roleRoute);

app.post('/chat', async (req, res) => {
  const {messages} = req.body
  try {
    const latestMessage = messages[messages?.length - 1]?.content

    let docContext = ""

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float"
    })

    console.log(embedding)

    try {
      const collection = db.collection(ASTRA_DB_COLLECTION as string)
      
      const cursor = collection.find({}, {
        sort: {
          $vector: embedding.data[0].embedding
        },
        limit: 10
      })

      

      const documents = await cursor.toArray()

      const docsMap = documents?.map(doc => doc.text)
    

      docContext = JSON.stringify(docsMap)
    
      const template = {
        role: 'system',
        content: ` You are an AI assistant who knows everything about Southern Convergence.
        Use the below context to augment what you know about Southern Convergence Technologies.
        The context will provide you with the most recent page data from the offician
        southern convergence website.
        If the context doesn't include the information you need answer based on your existing knowledge
        and don't mention the source of your information or what the context dows or doesn't include.
        Format response using markdown where applicable and don't return images.
      -------------
      START CONTEXT
      ${docContext}  
      END CONTEXT  
      -------------
      QUESTION: ${latestMessage}
      -------------
        `
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        stream: true,
        messages: [template, ...messages]
      })


      res.setHeader("Content-Type", "text/event-stream");
      for await (const chunk of response) {
        res.write(chunk.choices[0]?.delta.content || "");
      }
      res.end()
    } catch (err){
      console.log("Engggkk Error", err)
    }

  } catch (err) {
    throw err
  }

});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);

    
});