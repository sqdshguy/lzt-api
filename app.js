const express = require("express");
const puppeteer = require("puppeteer");
const { parse } = require("node-html-parser");

const app = express();

app.get("/", (req, res) => {
  res.send("За эту страничку мне не платил Ланской");
});


app.get("/api/latest", async (req, res) => {
  const postJson = [];

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(true);

  await page.goto("https://lolz.guru");
  await page.waitForNavigation();

  const content = await page.content();
  await browser.close();

  const parsed = parse(content);
  const posts = parsed.querySelectorAll(".PreviewTooltip");

  for (const post of posts) {
    const title = post.querySelector(".title").querySelector("span").rawText;
    const authorUsername = post.querySelector(".username").firstChild.rawText;
    const time = post.querySelector(".DateTime").rawText;
    const commentCount = post.querySelector(".discussionListItem--replyCount").rawText;
    postJson.push({
      title: title,
      author: authorUsername,
      time: time,
      commentCount: commentCount,
    });
  }
  res.json(postJson);
});


app.listen(3000, () => console.log("Ланской съел lolzteam"));
