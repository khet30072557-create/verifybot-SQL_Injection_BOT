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
const ROLE_ID = "1520398527069687901";

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

const userMessages = new Map();

client.once(Events.ClientReady, () => {
console.log(`ออนไลน์: ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {

console.log("มีข้อความ:", message.content);

if(message.author.bot) return;
if(!message.guild) return;
if(message.author.bot) return;
if(!message.guild) return;

// Verify
if(message.content === "!verify") {

const row = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId("verify")
.setLabel("✅ รับยศแฮกเกอร์ฝึกหัด")
.setStyle(ButtonStyle.Success)
);

await message.channel.send({
content:"กดปุ่มเพื่อยืนยันตัวตนเป็นเเฮกเกอร์ฝึกหัด",
components:[row]
});

}

// Anti-spam
if(message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)) return;

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

if(filtered.length >= 5){

await message.delete().catch(()=>{});

await message.channel.send({
content:`⚠️ ${message.author} กรุณาหยุดสแปม`
});

}

if(filtered.length >= 10){

await message.member.timeout(
600000,
"Spam detected"
).catch(()=>{});

}

});

client.on(Events.InteractionCreate, async (interaction)=>{

if(!interaction.isButton()) return;

if(interaction.customId==="verify"){

const role = interaction.guild.roles.cache.get(ROLE_ID);

if(role){

await interaction.member.roles.add(role);

await interaction.reply({
content:"✅ รับยศเรียบร้อย",
ephemeral:true
});

}

}

});

process.on("uncaughtException", (err) => {
console.error("CRASH:", err);
});

process.on("unhandledRejection", (err) => {
console.error("PROMISE ERROR:", err);
});

client.login(TOKEN);
