"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const db_connection_1 = __importDefault(require("./db/db-connection"));
const role_route_1 = __importDefault(require("./routes/role.route"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const astra_db_ts_1 = require("@datastax/astra-db-ts");
const puppeteer_1 = require("@langchain/community/document_loaders/web/puppeteer");
const openai_1 = require("openai");
const text_splitter_1 = require("langchain/text_splitter");
const { ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION, ASTRA_DB_API_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN, OPENAI_API_KEY } = process.env;
const openai = new openai_1.OpenAI({ apiKey: OPENAI_API_KEY });
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
];
const client = new astra_db_ts_1.DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });
const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
});
const createCollection = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (similarityMetric = "dot_product") {
    try {
        if (!ASTRA_DB_COLLECTION) {
            throw new Error("ASTRA_DB_COLLECTION is undefined. Please provide a valid collection name.");
        }
        const collections = yield db.listCollections();
        const collectionExists = collections.some((col) => col.name === ASTRA_DB_COLLECTION);
        if (collectionExists) {
            console.log(`Collection '${ASTRA_DB_COLLECTION}' already exists. Skipping creation.`);
            return;
        }
        const res = yield db.createCollection(ASTRA_DB_COLLECTION, {
            vector: {
                dimension: 1536,
                metric: similarityMetric,
            },
        });
        console.log("Collection created:", res);
    }
    catch (error) {
        console.error("Error while creating collection:", error);
    }
});
const loadSampleData = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c, _d, e_2, _e, _f;
    const collection = yield db.collection(ASTRA_DB_COLLECTION);
    try {
        for (var _g = true, sctc_url_1 = __asyncValues(sctc_url), sctc_url_1_1; sctc_url_1_1 = yield sctc_url_1.next(), _a = sctc_url_1_1.done, !_a; _g = true) {
            _c = sctc_url_1_1.value;
            _g = false;
            const url = _c;
            const content = yield scrapePage(url);
            const chunks = yield splitter.splitText(content);
            try {
                for (var _h = true, chunks_1 = (e_2 = void 0, __asyncValues(chunks)), chunks_1_1; chunks_1_1 = yield chunks_1.next(), _d = chunks_1_1.done, !_d; _h = true) {
                    _f = chunks_1_1.value;
                    _h = false;
                    const chunk = _f;
                    const embedding = yield openai.embeddings.create({
                        model: "text-embedding-3-small",
                        input: chunk,
                        encoding_format: "float"
                    });
                    const vector = embedding.data[0].embedding;
                    const res = yield collection.insertOne({
                        $vector: vector,
                        text: chunk
                    });
                    console.log(res);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_h && !_d && (_e = chunks_1.return)) yield _e.call(chunks_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (!_g && !_a && (_b = sctc_url_1.return)) yield _b.call(sctc_url_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
});
const scrapePage = (url) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const loader = new puppeteer_1.PuppeteerWebBaseLoader(url, {
        launchOptions: {
            headless: true
        },
        gotoOptions: {
            waitUntil: "domcontentloaded"
        },
        evaluate: (page, browser) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield page.evaluate(() => document.body.innerHTML);
            yield browser.close();
            return result;
        })
    });
    return (_a = (yield loader.scrape())) === null || _a === void 0 ? void 0 : _a.replace(/<[^>]*>?/gm, '');
});
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
(0, db_connection_1.default)();
createCollection().then(() => loadSampleData()).then(() => {
    console.log("Loaded sample data");
}).catch((error) => {
    console.error(error);
});
// Middleware
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Routes
app.use((0, cors_1.default)());
app.use('/', role_route_1.default);
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_3, _b, _c;
    var _d, _e;
    const { messages } = req.body;
    try {
        const latestMessage = (_d = messages[(messages === null || messages === void 0 ? void 0 : messages.length) - 1]) === null || _d === void 0 ? void 0 : _d.content;
        let docContext = "";
        const embedding = yield openai.embeddings.create({
            model: "text-embedding-3-small",
            input: latestMessage,
            encoding_format: "float"
        });
        try {
            const collection = db.collection(ASTRA_DB_COLLECTION);
            const cursor = collection.find({}, {
                sort: {
                    $vector: embedding.data[0].embedding
                },
                limit: 10
            });
            const documents = yield cursor.toArray();
            const docsMap = documents === null || documents === void 0 ? void 0 : documents.map(doc => doc.text);
            docContext = JSON.stringify(docsMap);
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
            };
            const response = yield openai.chat.completions.create({
                model: "gpt-4",
                stream: true,
                messages: [template, ...messages]
            });
            res.setHeader("Content-Type", "text/event-stream");
            try {
                for (var _f = true, response_1 = __asyncValues(response), response_1_1; response_1_1 = yield response_1.next(), _a = response_1_1.done, !_a; _f = true) {
                    _c = response_1_1.value;
                    _f = false;
                    const chunk = _c;
                    res.write(((_e = chunk.choices[0]) === null || _e === void 0 ? void 0 : _e.delta.content) || "");
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (!_f && !_a && (_b = response_1.return)) yield _b.call(response_1);
                }
                finally { if (e_3) throw e_3.error; }
            }
            res.end();
        }
        catch (err) {
            console.log("Engggkk Error", err);
        }
    }
    catch (err) {
        throw err;
    }
}));
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
