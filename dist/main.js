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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rest_1 = require("@octokit/rest");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const githubToken = process.env.GITHUB_TOKEN;
app.use(express_1.default.json());
const octokit = new rest_1.Octokit({
    auth: githubToken,
});
function getPullRequest(owner, repo, pull_number) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const pr = yield octokit.pulls.get({
                owner,
                repo,
                pull_number,
            });
            return pr.data;
        }
        catch (error) {
            console.error(error);
            return null;
        }
    });
}
function createReview(owner, repo, pull_number, commit_id, body, event) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const review = yield octokit.pulls.createReview({
                owner,
                repo,
                pull_number,
                commit_id,
                body,
                event,
            });
            return review.data;
        }
        catch (error) {
            console.error(error);
            return null;
        }
    });
}
app.post('/trigger-review', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { owner, repo, pull_number, focusAreas } = req.body;
    // Validate the input
    if (!owner || !repo || !pull_number) {
        return res.status(400).send('Missing required parameters');
    }
    const pr = yield getPullRequest(owner, repo, pull_number);
    if (!pr) {
        return res.status(404).send('Pull request not found');
    }
    // Here, you can analyze the PR, its files, and its changes to generate the review.
    // You can use the "focusAreas" parameter to customize the analysis.
    // For the sake of simplicity, we'll use a hardcoded review message in this example.
    const reviewMessage = 'This is a sample review message from ChatGPT.';
    // Submit the review
    const review = yield createReview(owner, repo, pull_number, pr.head.sha, reviewMessage, 'COMMENT');
    if (!review) {
        return res.status(500).send('Failed to create a review');
    }
    res.send('Review submitted successfully');
}));
app.all('/github-api/*', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const apiUrl = `https://api.github.com${req.url.replace('/github-api', '')}`;
    try {
        const response = yield (0, axios_1.default)({
            method: req.method,
            url: apiUrl,
            headers: Object.assign(Object.assign({}, req.headers), { Authorization: `token ${githubToken}` }),
            data: req.body,
        });
        res.status(response.status).send(response.data);
    }
    catch (error) {
        if (error && typeof error === 'object' && 'response' in error && error.response) {
            const response = error.response;
            res.status(response.status).send(response.data);
        }
        else {
            res.status(500).send('An error occurred while making the request');
        }
    }
}));
// Other routes and helper functions will go here.
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
