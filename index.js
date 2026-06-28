require("dotenv").config();

const {
Client,
GatewayIntentBits,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
Events
} = require("discord.js");

const TOKEN = process.env.TOKEN;

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});
const ROLE_ID = "1520398527069687901";

client.once(Events.ClientReady, () => {
console.log(`ออนไลน์: ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {

if(message.author.bot) return;

if(message.content === "!verify"){

const row = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId("verify")
.setLabel("✅ รับยศเเฮกเกอร์ฝึกหัด")
.setStyle(ButtonStyle.Success)
);

message.channel.send({
content:"กดปุ่มเพื่อยืนยันตัวตนว่าเป็นมนุษย์ที่พร้อมเป็นเเฮกเกอร์ฝึกหัด",
components:[row]
});

}

});

client.on(Events.InteractionCreate, async interaction => {

if(!interaction.isButton()) return;

if(interaction.customId==="verify"){

const role =
interaction.guild.roles.cache.get(ROLE_ID);

await interaction.member.roles.add(role);

await interaction.reply({
content:"ยืนยันสำเร็จ รับยศแล้ว",
ephemeral:true
});

}

});

const userMessages = new Map();

client.on(Events.MessageCreate, async (message) => {

if(message.author.bot) return;

if(message.member.permissions.has("Administrator"))
return;

const userId = message.author.id;
const now = Date.now();

if(!userMessages.has(userId)){
userMessages.set(userId, []);
}

const timestamps = userMessages.get(userId);

timestamps.push(now);

const filtered = timestamps.filter(
time => now - time < 5000
);

userMessages.set(userId, filtered);

// 5 ข้อความใน 5 วินาที
if(filtered.length >= 5){

await message.delete().catch(()=>{});

await message.channel.send({
content:`${message.author} กรุณาหยุดสแปม`
});

}

// 10 ข้อความใน 5 วินาที
if(filtered.length >= 10){

await message.member.timeout(
600000,
"Spam detected"
).catch(()=>{});

await message.channel.send({
content:`🚫 ${message.author} ถูก Timeout 10 นาที`
});

}

});
client.login(TOKEN);