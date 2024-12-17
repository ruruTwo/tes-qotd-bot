require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const axios = require('axios');

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const URL = process.env.QUESTIONS_URL;
const TOKEN = process.env.DISCORD_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.CONFIG_ID;
const INTERVAL = process.env.INTERVAL_HOURS * 60 * 60 * 1000;
app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function getConfigValues() {
    const url = `https://api.github.com/gists/${GIST_ID}`;
    const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
    const fileContent = response.data.files['config.json'].content;
    return JSON.parse(fileContent);
}

async function updateConfigValues(config) {
    const url = `https://api.github.com/gists/${GIST_ID}`;
    const updatedContent = {
        files: {
            'config.json': {
                content: JSON.stringify(config, null, 2),
            },
        },
    };
    await axios.patch(url, updatedContent, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
    });
}

async function loadQuestions() {
    try {
        const response = await axios.get(URL);
        const lines = response.data.split('\n').filter(line => line.trim()); 
        return lines;
    } catch (error) {
        console.error('Failed to fetch messages:', error);
        return []; 
    }
}

// Initialize
client.once('ready', () => {
    console.log('Logged in as ${client.user.tag}!');
    postQuestion();
    setInterval(postQuestion, INTERVAL);
});

async function postQuestion() {
    let questions;
    try {
        questions = await loadQuestions();
        config = await getConfigValues();
    } catch (err) {
        console.error('Error loading questions:', err);
        process.exit(1);
    }
    
    if (!questions.length) {
        console.error('No more questions available! Posting paused.');
        return;
    }

    const currentQuestion = questions[config.index];
    const channel = client.channels.cache.get(config.channel);

    if (!channel) {
        console.error('Channel not found!');
        return;
    }

    const questionEmbed = new EmbedBuilder()
        .setColor(0xE0E0E0)
        .setTitle('Question of the Day')
        .setDescription(currentQuestion);

    channel.send({ embeds: [questionEmbed] })
        .then(() => {
            console.log('Question sent:', currentQuestion);
        })
        .catch(console.error);

    config.index = config.index + 1;    

    updateConfigValues(config);
}

client.login(TOKEN);
