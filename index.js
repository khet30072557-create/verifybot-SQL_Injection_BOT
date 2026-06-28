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

// บอทออนไลน์
client.once(Events.ClientReady, () => {
console.log(`ออนไลน์: ${client.user.tag}`);
});

// ระบบ !verify
client.on(Events.MessageCreate, async (message) => {

if(message.author.bot) return;

if(message.content === "!verify"){

const row = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId("verify")
.setLabel("✅ รับยศแฮกเกอร์ฝึกหัด")
.setStyle(ButtonStyle.Success)
);

await message.channel.send({
content:"กดปุ่มเพื่อยืนยันตัวตนว่าเป็นมนุษย์ที่พร้อมเป็นเเฮกเกอร์ฝึกหัด",
components:[row]
});

}

});

// ระบบกดปุ่มรับยศ
client.on(Events.InteractionCreate, async interaction => {

if(!interaction.isButton()) return;

if(interaction.customId==="verify"){

const role =
interaction.guild.roles.cache.get(ROLE_ID);

if(!role){

return interaction.reply({
content:"❌ ไม่พบยศ",
ephemeral:true
});

}

await interaction.member.roles.add(role);

await interaction.reply({
content:"✅ รับยศเรียบร้อย",
ephemeral:true
});

}

});

// ===== Anti Spam =====

const userMessages = new Map();

client.on(Events.MessageCreate, async (message)=>{

if(message.author.bot) return;
if(!message.guild) return;

// ข้ามแอดมิน
if(
message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)
)return;

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

// 5 ข้อความใน 5 วิ
if(filtered.length >= 5){

await message.delete().catch(()=>{});

await message.channel.send({
content:`⚠️ ${message.author} กรุณาหยุดสแปม`
});

}

// 10 ข้อความใน 5 วิ
if(filtered.length >= 10){

await message.member.timeout(
10 * 60 * 1000,
"Spam detected"
).catch(()=>{});

await message.channel.send({
content:`🚫 ${message.author} ถูก Timeout 10 นาที`
});

}

});

client.login(TOKEN);