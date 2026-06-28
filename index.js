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
const ROLE_ID = "ใส่_ROLE_ID_ตรงนี้";

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

client.on(Events.MessageCreate, async (message)=>{

if(message.author.bot) return;
if(!message.guild) return;

// !verify
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

// Anti-spam
if(
message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)
)return;

const userId = message.author.id;
const now = Date.now();

let data = userMessages.get(userId);

if(!data){

userMessages.set(userId,{
count:1,
lastMessage:now
});

return;
}

if(now - data.lastMessage > 5000){

data.count = 1;
data.lastMessage = now;

return;
}

data.count++;
data.lastMessage = now;

if(data.count >= 5){

await message.delete().catch(()=>{});

await message.channel.send({
content:`⚠️ ${message.author} กรุณาหยุดสแปม`
});

}

if(data.count >= 10){

await message.member.timeout(
600000,
"Spam detected"
).catch(()=>{});

await message.channel.send({
content:`🚫 ${message.author} ถูก Timeout 10 นาที`
});

data.count=0;

}

});

client.on(
Events.InteractionCreate,
async interaction=>{

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
