require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const people = JSON.parse(fs.readFileSync('People.txt'));
const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});
async function queryapi(link){
    return (await fetch(link)).json();
}
let lastcontest=undefined,team1,team2;
let starttime;
let lastquery={};
let lastupdate={};
let getresults=undefined;
let makereact=undefined;
let channelid="692098647428431965";
let permissionrole="704783567254716541";
let botid="704689536034406461";
let myid="203212988264480769";
let contesttypes={"div1":"Div. 1","div2":"Div. 2","div1+2":"Div. 1 + Div. 2","acm":"ACM","div3":"Div. 3"};
let currentmessage=undefined;
function autoembed(){
    let ret=new Discord.MessageEmbed().setTitle("").setDescription("");
    let entire="";
    let teamst="";
    teamsize=team1.length;
    for(let i=0;i<team1.length;i++){
        ret.title+=people[team1[i]][0]+(i==team1.length-1?" vs ":" & ");
        teamst+="[https://www.twitch.tv/"+people[team1[i]][1]+"](https://www.twitch.tv/"+people[team1[i]][1]+")\n";
        entire+=people[team1[i]][1]+"/";
    }
    ret.addField("Team 1 Stream"+(teamsize>1?"s":""),teamst);
    teamst="";
    for(let i=0;i<team2.length;i++){
        ret.title+=people[team2[i]][0]+(i==team2.length-1?"":" & ");
        teamst+="[https://www.twitch.tv/"+people[team2[i]][1]+"](https://www.twitch.tv/"+people[team2[i]][1]+")\n";
        entire+=people[team2[i]][1]+(i==team2.length-1?"":"/");
    }
    ret.addField("Team 2 Stream"+(teamsize>1?"s":""),teamst);
    ret.addField("Multitwitch","[https://beta.multitwitch.net/"+entire+"](https://beta.multitwitch.net/"+entire+")");
    ret.addField("Contest","["+lastcontest["result"]["contest"]["name"]+"](https://codeforces.com/"+(lastcontest["result"]["contest"]["id"]>=100000?"gym":"contest")+"/"+lastcontest["result"]["contest"]["id"].toString()+")");
    ret.addField("Start",starttime.toString());
    let endtime=new Date(starttime.getTime()+parseInt(lastcontest["result"]["contest"]["durationSeconds"])*1000);
    ret.addField("End",endtime.toString());
    return ret;
}

function setfunction(endtime){
    getresults=setTimeout(async function(){
        if(lastcontest==undefined)return;
        let result = await queryapi("https://codeforces.com/api/contest.standings?contestId="+lastcontest["result"]["contest"]["id"]+"&showUnofficial=true");
        if(result["status"]=="FAILED"){
            client.channels.cache.get(channelid).lastMessage.reactions.resolve("🔄").users.remove(botid);
            lastcontest=undefined;
            getresults=undefined;
            currentmessage=undefined;
            return client.channels.cache.get(channelid).send("Error Getting Results");
        }
        let team1results=undefined,team2results=undefined;
        for(let i=0;i<result["result"]["rows"].length;i++){
            for(let j=0;j<result["result"]["rows"][i]["party"]["members"].length;j++){
                if(result["result"]["rows"][i]["party"]["members"][j]["handle"].toLowerCase()==team1[0]&&result["result"]["rows"][i]["party"]["participantType"]=="VIRTUAL"){
                    team1results=result["result"]["rows"][i];
                }
                else if(result["result"]["rows"][i]["party"]["members"][j]["handle"].toLowerCase()==team2[0]&&result["result"]["rows"][i]["party"]["participantType"]=="VIRTUAL"){
                    team2results=result["result"]["rows"][i];
                }
            }
        }
        if(team1results==undefined||team2results==undefined){
            client.channels.cache.get(channelid).lastMessage.reactions.resolve("🔄").users.remove(botid);
            lastcontest=undefined;
            getresults=undefined;
            currentmessage=undefined;
            return client.channels.cache.get(channelid).send("Error Getting Results");
        }
        let ret=autoembed();
        let teamsize=team1.length;
        let team1people="",team2people="";
        for(let i=0;i<teamsize;i++){
            team1people+=people[team1[i]][0]+(i==team1.length-1?"":" & ");
            team2people+=people[team2[i]][0]+(i==team2.length-1?"":" & ");
            people[team1[i]][3]++;
            people[team2[i]][3]++;
            if(team1results["rank"]!=team2results["rank"])people[(team1results["rank"]<team2results["rank"]?team1[i]:team2[i])][2]++;
        }
        fs.writeFileSync('People.txt',JSON.stringify(people));
        ret.addField("Winner",(team1results["rank"]==team2results["rank"]?"It's A TIE":(team1results["rank"]<team2results["rank"]?team1people:team2people)));
        let team1solves="",team2solves="";
        for(let i=0;i<team1results["problemResults"].length;i++){
            if(team1results["problemResults"][i]["points"]>0){
                team1solves+=result["result"]["problems"][i]["index"];
            }
        }
        for(let i=0;i<team2results["problemResults"].length;i++){
            if(team2results["problemResults"][i]["points"]>0){
                team2solves+=result["result"]["problems"][i]["index"];
            }
        }
        if(team1solves=="")team1solves="NONE"
        if(team2solves=="")team2solves="NONE"
        ret.addField(team1people+" Solves:",team1solves);
        ret.addField(team2people+" Solves:",team2solves);
        client.channels.cache.get(channelid).lastMessage.edit(ret);
        client.channels.cache.get(channelid).lastMessage.reactions.resolve("🔄").users.remove(botid);
        lastcontest=undefined;
        getresults=undefined;
        currentmessage=undefined;
    },endtime-Date.now()+60000);
}
function addreact(){
    makereact=setTimeout(function(){
        client.channels.cache.get(channelid).lastMessage.react("🔄");
        makereact=undefined;
    },starttime-Date.now()+60000);
}
client.on('messageReactionAdd', async (reaction, user) => {
    if(user.bot)return;
    if(reaction.message==currentmessage&&reaction.emoji.name=="🔄"){
        reaction.users.remove(user);
        if((lastupdate[user.id]!=undefined&&Date.now()-lastupdate[user.id]<5000)||Date.now()<starttime)return;
        lastupdate[user.id]=Date.now();
        let result = await queryapi("https://codeforces.com/api/contest.standings?contestId="+lastcontest["result"]["contest"]["id"]+"&showUnofficial=true");
        if(result["status"]=="FAILED")return client.channels.cache.get(channelid).send("Error Getting Results");
        let team1results=undefined,team2results=undefined;
        for(let i=0;i<result["result"]["rows"].length;i++){
            for(let j=0;j<result["result"]["rows"][i]["party"]["members"].length;j++){
                if(result["result"]["rows"][i]["party"]["members"][j]["handle"].toLowerCase()==team1[0]&&result["result"]["rows"][i]["party"]["participantType"]=="VIRTUAL"){
                    team1results=result["result"]["rows"][i];
                }
                else if(result["result"]["rows"][i]["party"]["members"][j]["handle"].toLowerCase()==team2[0]&&result["result"]["rows"][i]["party"]["participantType"]=="VIRTUAL"){
                    team2results=result["result"]["rows"][i];
                }
            }
        }
        if(team1results==undefined||team2results==undefined)return client.channels.cache.get(channelid).send("Error Getting Results");
        let ret=autoembed();
        let teamsize=team1.length;
        let team1people="",team2people="";
        for(let i=0;i<teamsize;i++){
            team1people+=people[team1[i]][0]+(i==team1.length-1?"":" & ");
            team2people+=people[team2[i]][0]+(i==team2.length-1?"":" & ");
            people[team1[i]][3]++;
            people[team2[i]][3]++;
            if(team1results["rank"]!=team2results["rank"])people[(team1results["rank"]<team2results["rank"]?team1[i]:team2[i])][2]++;
        }
        fs.writeFileSync('People.txt',JSON.stringify(people));
        ret.addField("Winning",(team1results["rank"]==team2results["rank"]?"It's A TIE":(team1results["rank"]<team2results["rank"]?team1people:team2people)));
        let team1solves="",team2solves="";
        for(let i=0;i<team1results["problemResults"].length;i++){
            if(team1results["problemResults"][i]["points"]>0){
                team1solves+=result["result"]["problems"][i]["index"];
            }
        }
        for(let i=0;i<team2results["problemResults"].length;i++){
            if(team2results["problemResults"][i]["points"]>0){
                team2solves+=result["result"]["problems"][i]["index"];
            }
        }
        if(team1solves=="")team1solves="NONE"
        if(team2solves=="")team2solves="NONE"
        ret.addField(team1people+" Solves:",team1solves);
        ret.addField(team2people+" Solves:",team2solves);
        client.channels.cache.get(channelid).lastMessage.edit(ret);
    }
})
client.on('message',async (msg)=>{
    if(msg.author.bot)return;
    if(msg.content[0]!=":")return;
    let args=msg.content.split(/\s+/);
    args[0]=args[0].substr(1);
    if (args[0]=="vc") {
        if(args.length>17)return msg.reply("Too many users, stop trying to get me blocked.");
        if(args.length==1)return msg.channel.send("Please provide users and a contest type.");
        if(contesttypes[args[args.length-1]]==undefined)return msg.channel.send("Invalid contest type.");
        if(lastquery[msg.author.id]!=undefined&&Date.now()-lastquery[msg.author.id]<5000)return msg.reply("Please wait 5 seconds before querying again.");
        lastquery[msg.author.id]=Date.now();
        let badcontests = new Set();
        for(let i=1;i<args.length-1;i++){
            let result = await queryapi("https://codeforces.com/api/user.status?handle="+args[i]);
            if(result["status"]=="FAILED")return msg.channel.send("Invalid User");
            for (let i = 0; i < result["result"].length; i++) {
                badcontests.add(result["result"][i]["contestId"]);
            }
        }
        let contests = [];
        let result;
        if(contesttypes[args[args.length-1]]=="ACM")result=await queryapi('https://codeforces.com/api/contest.list?gym=true');
        else result=await queryapi('https://codeforces.com/api/contest.list');
        for (let i = 0; i < result["result"].length; i++) {
            if (result["result"][i]["phase"] == "FINISHED") {
                if (result["result"][i]["name"].includes(contesttypes[args[args.length-1].toLowerCase()])) {
                    if (!badcontests.has(result["result"][i]["id"])) {
                        contests.push([result["result"][i]["id"],result["result"][i]["name"]]);
                    }
                }
            }
        };
        if(contests.length==0)return msg.channel.send("No Available Contest.");
        let ret=new Discord.MessageEmbed().setTitle("Recommended Contests").setDescription("");
        let retcontests=new Set();
        while(retcontests.size<Math.min(5,contests.length))retcontests.add(contests[Math.floor(Math.random()*(contests.length-1))]);
        let ind=1;
        for(let x of retcontests){
            ret.description+=ind.toString()+". ["+x[1]+"](https://codeforces.com/"+(x[0]>=100000?"gym":"contest")+"/"+x[0].toString()+")\n";
            ind++;
        }
        return msg.channel.send(ret);
    }
    if(args[0]=="setup"){
        if(!msg.member.roles.cache.has(permissionrole))return msg.channel.send("Insufficent Permissions");
        let teamsize=parseInt(args[1]);
        if(args.length!=2*teamsize+1+3)return msg.channel.send("Invalid Parameters");
        if(lastcontest!=undefined)return msg.channel.send("Virutal battle currently running, use getresults to finish current battle.");
        for(let i=0;i<2*teamsize;i++){
            args[i+2]=args[i+2].toLowerCase();
            if(people[args[i+2]]==undefined)return msg.channel.send(args[i+2]+" is not yet in the list of virtual combtants, use the add command(add CF_HANDLE NAME TWITCH_NAME) to become a virtual contestant.");
        }
        args[args.length-2]=args[args.length-2].substr(args[args.length-2].lastIndexOf("/")+1);
        team1=args.slice(2,2+teamsize),team2=args.slice(2+teamsize,2+2*teamsize);
        let result = await queryapi("https://codeforces.com/api/contest.standings?contestId="+args[args.length-2]+"&showUnofficial=true");
        if(result["status"]=="FAILED")return msg.channel.send("Invalid Contest");
        lastcontest=result;
        let sttime=args[args.length-1].split(":");
        starttime=new Date;
        starttime.setHours(parseInt(sttime[0]));
        starttime.setMinutes(parseInt(sttime[1]));
        starttime.setSeconds(0);
        starttime.setMilliseconds(0);
        let ret=autoembed();
        await client.channels.cache.get(channelid).send(ret);
        let endtime=new Date(starttime.getTime()+parseInt(lastcontest["result"]["contest"]["durationSeconds"])*1000);
        setfunction(endtime);
        addreact();
        currentmessage=client.channels.cache.get(channelid).lastMessage;
        return msg.channel.send("Battle Successfully Setup");
    }
    if(args[0]=="add"){
        if(args.length!=4)return msg.channel.send("Invalid Parameters");
        if(!msg.member.roles.cache.has(permissionrole))return msg.channel.send("Insufficent Permissions");
        args[1]=args[1].toLowerCase();
        let result = await queryapi("https://codeforces.com/api/user.status?handle="+args[1]);
        if(result["status"]=="FAILED")return msg.channel.send("Invalid User");
        if(people[args[1]]!=undefined)return msg.channel.send("User Already Exisits");
        people[args[1]]=[args[2],args[3],0,0];
        fs.writeFileSync('People.txt',JSON.stringify(people));
        return msg.channel.send("User Successfully Added");
    }
    if(args[0]=="update"){
        if(args.length!=2)return msg.channel.send("Invalid Parameters");
        if(!msg.member.roles.cache.has(permissionrole))return msg.channel.send("Insufficent Permissions");
        if(lastcontest==undefined)return msg.channel.send("No Upcoming Battle");
        clearTimeout(getresults),getresults=undefined,clearTimeout(makereact),makereact=undefined;
        let sttime=args[1].split(":");
        starttime=new Date;
        starttime.setHours(parseInt(sttime[0]));
        starttime.setMinutes(parseInt(sttime[1]));
        starttime.setSeconds(0);
        starttime.setMilliseconds(0);
        let ret=autoembed();
        client.channels.cache.get(channelid).lastMessage.edit(ret);
        let endtime=new Date(starttime.getTime()+parseInt(lastcontest["result"]["contest"]["durationSeconds"])*1000);
        setfunction(endtime);
        addreact();
        return msg.channel.send("Successfully Edited");
    }
    if(args[0]=="cancel"){
        if(!msg.member.roles.cache.has(permissionrole))return msg.channel.send("Insufficent Permissions");
        if(lastcontest==undefined)return msg.channel.send("No Upcoming Battle");
        lastcontest=undefined;
        client.channels.cache.get(channelid).lastMessage.delete();
        clearTimeout(getresults),getresults=undefined,clearTimeout(makereact),makereact=undefined;
        currentmessage=undefined;
        return msg.channel.send("Successfully Canceled");
    }
    if(args[0]=="getresults"){
        if(!msg.member.roles.cache.has(permissionrole))return msg.channel.send("Insufficent Permissions");
        if(lastcontest==undefined)return msg.channel.send("No Battle");
        clearTimeout(getresults),getresults=undefined,clearTimeout(makereact),makereact=undefined;
        setfunction(new Date((new Date).getTime()-50000));
        return msg.channel.send("Results Successfully Updated");
    }
    if(args[0]=="delete"){
        if(!msg.member.roles.cache.has(permissionrole))return msg.channel.send("Insufficent Permissions");
        client.channels.cache.get(channelid).bulkDelete(1);
        return msg.channel.send("Last Message Successfully Deleted");
    }
    if(args[0]=="funny"&&msg.author.id==myid){
        //(await msg.channel.messages.fetch("705157639272792167")).delete();
        let role = msg.guild.roles.cache.find(role => role.name == "post-contest");
        msg.guild.members.resolve(myid).roles.add(role);
        // msg.guild.members.resolve("156090339696836608").roles.remove("583006773934555146");
    }
    if(args[0]=="unfunny"&&msg.author.id==myid){
        //(await msg.channel.messages.fetch("705157639272792167")).delete();
        let role = msg.guild.roles.cache.find(role => role.name == "cco");
        msg.guild.members.resolve(myid).roles.remove(role);
        // msg.guild.members.resolve("156090339696836608").roles.add("583006773934555146");
    }
})
client.login(process.env.DISCORD_TOKEN);