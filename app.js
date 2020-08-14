/*

  Lolzteam Unofficial API
  by Mrsasha45op
  MIT License

*/


const express = require("express");
const helmet = require("helmet");
const puppeteer = require("puppeteer");
const rateLimit = require("express-rate-limit");
const middlewares = require("./middlewares");
const cors = require("cors");
const { parse } = require("node-html-parser");


const app = express();

// Security fixes
app.use(helmet());
app.use(cors())

// Rate limit API
const limiter = rateLimit({
  windowMs: 30 * 1000,
  max: 15,
});


app.get("/", (req, res) => {
  res.send("Coming soon...");
});

let cachedData;
let cacheTime;

let userCache = new Map();


app.get("/api/latest", limiter, async (req, res) => {
  // Cache header for browsers
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600');

  // Manual cache
  if (cacheTime && cacheTime > Date.now() - 30 * 1000) {
    return res.json(cachedData);
  }

  const postJson = [];
  try {
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
      const category = post.querySelector(".threadNode").rawText;
      const authorUsername = post.querySelector(".username").firstChild.rawText;
      const time = post.querySelector(".DateTime").rawText;
      const commentCount = post.querySelector(".discussionListItem--replyCount").rawText;
      const styleElem = post.querySelector(".secondRow").querySelector(".posterDate").querySelector(".username").firstChild;
      const style = styleElem.getAttribute('class');
      const userRole = getRole(style);
      const link = "https://lolz.guru/" + post.getAttribute("href");

      postJson.push({
        title,
        authorUsername,
        category,
        time,
        commentCount,
        userRole,
        link
      });
    }
    // Manual cache
    cachedData = postJson;
    cacheTime = Date.now();

    return res.json(postJson);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/user/:user", limiter, async (req, res, next) => {
  // Cache header for browsers
  res.set('Cache-Control', 'public, max-age=300, s-maxage=600') ;

  const id = req.params.user;

  const cache = userCache.get(id);

  // Manual cache
  if (cache) {
    if (cache.cacheTime && cache.cacheTime > Date.now() - 30 * 1000) return res.json(cache.data); 
  }
  
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setJavaScriptEnabled(true);

    if(!isNaN(id)) {
      await page.goto("https://lolz.guru/members/" + id);
    }
    else {
      await page.goto("https://lolz.guru/" + id);
    }
    await page.waitForNavigation();

    const content = await page.content();
    await browser.close();


    const parsed = parse(content);

    const title = parsed.querySelector("head").querySelector("title").rawText;

    if (title.includes("Ошибка")) {
      return res.status(404).json({ error: "User not found!" });
    }

    const classText = parsed.querySelector(".page_top").querySelector(".username").querySelector("span").getAttribute("class");
    const username = parsed.querySelector(".page_top").querySelector(".username").querySelector("span").rawText;
    const avatar = parsed.querySelector(".avatarScaler").querySelectorAll("img")[0].getAttribute("src");
    const lastSeen = parsed.querySelector(".page_top").querySelector(".profile_online").querySelector("abbr").rawText;
    const role = getRole(classText);
    let status;
    let isModer = false,
      isMainModer = false,
      isAdmin = false;

    if (parsed.querySelector(".page_top").querySelector(".current_text")) {
      status = parsed.querySelector(".page_top").querySelector(".current_text").rawText;
    } else {
      status = null;
    }
    if (parsed.querySelector("em.userBanner.moder")) {
      isModer = true
    }

    if (parsed.querySelector("em.userBanner.main_moder")) {
      isMainModer = true
    }

    if (parsed.querySelector("em.userBanner.admin")) {
      isAdmin = true
    }

    const messages = parsed.querySelector(".counts_module").querySelectorAll("a")[0].querySelector(".count").rawText;
    const likes = parsed.querySelector(".counts_module").querySelectorAll("a")[1].querySelector(".count").rawText.replace(" ", ",");

    const postJson = {
      username,
      avatar,
      status,
      lastSeen,
      stat: {
        messages,
        likes
      },
      role,
      isModer,
      isMainModer,
      isAdmin,
    };
    
    userCache.set(id, { data: postJson, cacheTime: Date.now()});

    res.send(postJson);
  } catch (error) {
    return next(error);
  }
});

// First version of getting user roles
function getRole(style) {
  const roleNum = style.replace("style", "");
  if (roleNum >= 25 && roleNum < 1000) {
    return "unik"
  }
  switch (roleNum) {
    case "3":
      return "admin"
    case "22":
      return "market_seller";
    case "8":
      return "supreme";
    case "2":
      return "user";
    case "11":
      return "forum_seller";
    case "26":
      return "legend";
    case "21":
      return "user";
    default:
      return "user";
  }
}

// Middlewares
app.use(middlewares.notFound);
app.use(middlewares.errorHandler);


const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening for requests on port ${port}`));