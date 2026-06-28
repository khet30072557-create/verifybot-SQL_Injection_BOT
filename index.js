require("dotenv").config();

const {
Client,
GatewayIntentBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
Events,
PermissionsBitField
} = require("discord.js");

const TOKEN = process.env.TOKEN;

// ใส่ ID ยศตรงนี้
const ROLE_ID = "1520398527069687901";

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

// เก็บข้อความของแต่ละคน
const userMessages = new Map();

client.on(Events.MessageCreate, async (message) => {

if(message.author.bot) return;
if(!message.guild) return;

// ข้ามแอดมิน
if(
message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)
) return;

const userId = message.author.id;
const now = Date.now();

let data = userMessages.get(userId);

if(!data){
data = {
count: 1,
lastMessage: now
};

userMessages.set(userId, data);

return;
}

// รีเซ็ตถ้าเกิน 5 วินาที
if(now - data.lastMessage > 5000){

data.count = 1;
data.lastMessage = now;

return;
}

data.count++;
data.lastMessage = now;

console.log(
`${message.author.tag}: ${data.count}`
);

// เตือน
if(data.count >= 5){

await message.delete().catch(()=>{});

await message.channel.send({
content:`⚠️ ${message.author} กรุณาหยุดสแปม`
});

}

// Timeout
if(data.count >= 10){

await message.member.timeout(
600000,
"Spam detected"
).catch(()=>{});

await message.channel.send({
content:`🚫 ${message.author} ถูก Timeout 10 นาที`
});

data.count = 0;

}

});
