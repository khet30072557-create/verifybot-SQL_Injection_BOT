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

const spamData = new Map();

client.once(Events.ClientReady, () => {
console.log(`ออนไลน์: ${client.user.tag}`);
});

// =====================
// MESSAGE EVENT
// =====================

client.on(Events.MessageCreate, async (message) => {

if(message.author.bot) return;
if(!message.guild) return;

// ข้ามแอดมิน
if(
message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)
){
return;
}

// =====================
// VERIFY
// =====================

if(message.content === "!verify"){

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

// =====================
// ANTI SPAM
// =====================

const userId = message.author.id;
const now = Date.now();

if(!spamData.has(userId)){

spamData.set(userId,{
messages:[],
lastContent:"",
warned:false
});

}

const data = spamData.get(userId);

// เก็บเวลา
data.messages.push(now);

// เก็บแค่ 5 วินาทีล่าสุด
data.messages = data.messages.filter(
time => now-time < 5000
);

// ตรวจข้อความซ้ำ
let repeated = false;

if(
message.content === data.lastContent &&
message.content.length > 1
){
repeated = true;
}

data.lastContent = message.content;


// ส่งรัวเกิน 5 ครั้ง
if(
data.messages.length >= 5 ||
repeated
){

await message.delete().catch(()=>{});

// กันเตือนรัว
if(!data.warned){

data.warned=true;

await message.channel.send({
content:
`⚠️ ${message.author} กรุณาหยุดสแปม`
});

setTimeout(()=>{
data.warned=false;
},5000);

}

}


// ส่งรัวเกิน 10 ครั้ง
if(data.messages.length >=10){

await message.member.timeout(
10*60*1000,
"Spam detected"
).catch(()=>{});

await message.channel.send({
content:
`🚫 ${message.author} ถูก Timeout 10 นาที`
});

spamData.delete(userId);

}

});

// =====================
// BUTTON VERIFY
// =====================

client.on(
Events.InteractionCreate,
async interaction => {

if(!interaction.isButton()) return;

if(interaction.customId==="verify"){

const role =
interaction.guild.roles.cache.get(
ROLE_ID
);

if(!role){

return interaction.reply({
content:"❌ ไม่พบยศ",
ephemeral:true
});

}

await interaction.member.roles.add(
role
);

await interaction.reply({
content:"✅ รับยศเรียบร้อย",
ephemeral:true
});

}

});

client.login(TOKEN);