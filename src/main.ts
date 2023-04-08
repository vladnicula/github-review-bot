import express from 'express';
import cors from 'cors';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import dotenv from 'dotenv';
import { Configuration, OpenAIApi }  from 'openai';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
const githubToken = process.env.GITHUB_TOKEN;

app.use(cors());
app.use(express.json());

app.use(express.static('public'));


const octokit = new Octokit({
  auth: githubToken,
});

const openAIConfiguration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(openAIConfiguration);

async function generateReviewMessage(prompt: string): Promise<string | null> {
    try {
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
            {role: 'system', content: 'you are a helpful github bot that does pull request reviews'},
            {role: 'user', content: prompt},
        ]
      });

      const firstChoiceForNow = response.data.choices[0].message

      if ( !firstChoiceForNow ) {
        throw new Error('No review message generated')
      }
  
      return firstChoiceForNow.content;
    } catch (error) {
      console.error('Error generating review message:', error);
      return null;
    }
  }
  
async function getPullRequest(owner: string, repo: string, pull_number: number) {
    try {
        const pr = await octokit.pulls.get({
          owner,
          repo,
          pull_number,
        });
        return pr.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function createReview(
    owner: string,
    repo: string,
    pull_number: number,
    commit_id: string,
    body: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
) {
    try {
        const review = await octokit.pulls.createReview({
        owner,
        repo,
        pull_number,
        commit_id,
        body,
        event,
        });
        return review.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

app.post('/trigger-review', async (req, res) => {
    const { owner, repo, pull_number, focusAreas } = req.body;

    // Validate the input
    if (!owner || !repo || !pull_number) {
        return res.status(400).send('Missing required parameters');
    }

    const pr = await getPullRequest(owner, repo, pull_number);
    if (!pr) {
        return res.status(404).send('Pull request not found');
    }

    const prompt = `Review the following pull request considering ${focusAreas}: ${pr.html_url}`;
    const reviewMessage = await generateReviewMessage(prompt);

    console.log(reviewMessage)
    return res.status(200).send('Debug done');

    // Debug for now

    // Submit the review
    // const review = await createReview(owner, repo, pull_number, pr.head.sha, reviewMessage, 'COMMENT');
    // if (!review) {
    //     return res.status(500).send('Failed to create a review');
    // }

    // res.send('Review submitted successfully');
});


app.all('/github-api/*', async (req, res) => {
    const apiUrl = `https://api.github.com${req.url.replace('/github-api', '')}`;
  
    try {
      const response = await axios({
        method: req.method as any,
        url: apiUrl,
        headers: {
          ...req.headers,
          Authorization: `token ${githubToken}`,
        },
        data: req.body,
      });
  
      res.status(response.status).send(response.data);
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error && error.response) {
        const response = error.response as Record<string, number>
        res.status(response.status).send(response.data);
      } else {
        res.status(500).send(`An unknown error occurred while making the request ${error}`);
      }
    }
});
  

  
  
// Other routes and helper functions will go here.

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
