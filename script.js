const navButtons=document.querySelectorAll(".nav");
const pages=document.querySelectorAll(".page");
const app=document.getElementById("app");
const authPage=document.getElementById("authPage");
const loginForm=document.getElementById("loginForm");
const signupForm=document.getElementById("signupForm");
const authMessage=document.getElementById("authMessage");

const dialogOrigins=new WeakMap();

function openDialog(dialog,opener=document.activeElement,preferredFocus=null){
    dialogOrigins.set(dialog,opener);
    dialog.classList.add("show");
    const target=preferredFocus||dialog.querySelector("button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex='-1'])");
    target?.focus();
}

function closeDialog(dialog,restoreFocus=true){
    dialog.classList.remove("show");
    if(restoreFocus){
        const opener=dialogOrigins.get(dialog);
        if(opener?.isConnected&&!opener.disabled)opener.focus();
    }
}

document.addEventListener("keydown",event=>{
    const activeDialog=document.querySelector(".modal.show");
    if(!activeDialog)return;

    if(event.key==="Escape"){
        event.preventDefault();
        if(activeDialog.id==="profileModal")closeProfileModal();
        else if(activeDialog.id==="modal")closeModal();
        else closeDialog(activeDialog);
        return;
    }

    if(event.key==="Tab"){
        const focusable=[...activeDialog.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[tabindex]:not([tabindex='-1'])")]
            .filter(element=>element.offsetParent!==null);
        if(!focusable.length)return;
        const first=focusable[0];
        const last=focusable[focusable.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
});

function setAuthMessage(message,type="error"){
    authMessage.textContent=message;
    authMessage.classList.toggle("success-message",type==="success");
}

navButtons.forEach(button=>{
button.addEventListener("click",()=>{
navButtons.forEach(btn=>btn.classList.remove("active"));
pages.forEach(page=>page.classList.remove("active"));
button.classList.add("active");
document.getElementById(button.dataset.page).classList.add("active");
});
});

function getToday(){
const date=new Date();
return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
}

const todayDate=getToday();
const today=new Date();

document.getElementById("date").textContent=today.toLocaleDateString("en-IN",{
weekday:"long",
day:"numeric",
month:"long"
});

let profile=JSON.parse(localStorage.getItem("focusRootProfile"))||{
name:"Anaya"
};

localStorage.setItem("focusRootProfile",JSON.stringify(profile));

function showProfile(){
    const name=profile.name||"Anaya";
    document.getElementById("profileName").textContent=name;
    document.getElementById("welcomeName").textContent=name.toUpperCase();
    document.querySelector(".user").textContent=name.charAt(0).toUpperCase();
    document.getElementById("profileDetailsName").textContent=name;
    document.getElementById("profileDetailsEmail").textContent=profile.email||"Not provided";
    document.getElementById("profileDetailsAvatar").textContent=name.charAt(0).toUpperCase();
}

showProfile();

const profileModal=document.getElementById("profileModal");
const profileDetailsModal=document.getElementById("profileDetailsModal");
const editProfileBtn=document.getElementById("editProfileBtn");
const closeProfileBtn=document.getElementById("closeProfile");
const saveProfileBtn=document.getElementById("saveProfile");

function openProfileDetails(){
    showProfile();
    document.getElementById("profileDetailsMessage").textContent="";
    openDialog(profileDetailsModal);
}

document.getElementById("profileTrigger").addEventListener("click",openProfileDetails);
document.getElementById("headerProfileTrigger").addEventListener("click",openProfileDetails);
document.getElementById("closeProfileDetails").addEventListener("click",()=>{
    closeDialog(profileDetailsModal);
});
profileDetailsModal.addEventListener("click",event=>{
    if(event.target===profileDetailsModal)closeDialog(profileDetailsModal);
});

editProfileBtn.addEventListener("click",()=>{
    const profileOpener=dialogOrigins.get(profileDetailsModal);
    closeDialog(profileDetailsModal,false);
    document.getElementById("editName").value=profile.name||"";
    document.getElementById("editEmail").value=profile.email||"";
    document.getElementById("profileMessage").textContent="";
    document.getElementById("profileMessage").classList.remove("success-message");
    openDialog(profileModal,profileOpener);
});

function closeProfileModal(){
    const profileOpener=dialogOrigins.get(profileModal);
    closeDialog(profileModal,false);
    openDialog(profileDetailsModal,profileOpener,editProfileBtn);
}

closeProfileBtn.addEventListener("click",closeProfileModal);
profileModal.addEventListener("click",event=>{
    if(event.target===profileModal)closeProfileModal();
});

[document.getElementById("editName"),document.getElementById("editEmail")].forEach(input=>{
    input.addEventListener("input",()=>{
        document.getElementById("profileMessage").textContent="";
    });
});

saveProfileBtn.addEventListener("click",()=>{
    const name=document.getElementById("editName").value.trim();
    const email=document.getElementById("editEmail").value.trim().toLowerCase();
    const profileMessage=document.getElementById("profileMessage");

    if(!name||!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        profileMessage.textContent="Enter a name and a valid email address.";
        profileMessage.classList.remove("success-message");
        (!name?document.getElementById("editName"):document.getElementById("editEmail")).focus();
        return;
    }

    const users=JSON.parse(localStorage.getItem("focusRootUsers"))||[];
    const loggedInEmail=localStorage.getItem("focusRootLoggedIn");
    const currentUser=users.find(user=>user.email===loggedInEmail);
    if(users.some(user=>user.email===email&&user.email!==loggedInEmail)){
        profileMessage.textContent="An account with this email already exists.";
        profileMessage.classList.remove("success-message");
        document.getElementById("editEmail").focus();
        return;
    }

    profile={...profile,name,email};
    localStorage.setItem("focusRootProfile",JSON.stringify(profile));
    if(currentUser){
        currentUser.name=name;
        currentUser.email=email;
        localStorage.setItem("focusRootUsers",JSON.stringify(users));
        localStorage.setItem("focusRootLoggedIn",email);
    }

    showProfile();
    document.getElementById("profileDetailsMessage").textContent="Profile saved successfully.";
    closeProfileModal();
});

let savedTasks=localStorage.getItem("focusRootTasks");

let tasks=savedTasks?JSON.parse(savedTasks):[
{
id:1,
name:"Complete DBMS Assignment",
subject:"DBMS",
priority:"High",
date:todayDate,
done:true,
completedDate:todayDate
},
{
id:2,
name:"Practice JavaScript",
subject:"Development",
priority:"Medium",
date:todayDate,
done:false,
completedDate:null
}
];

localStorage.setItem("focusRootTasks",JSON.stringify(tasks));

const modal=document.getElementById("modal");
const addBtn=document.getElementById("addBtn");
const closeBtn=document.getElementById("close");
const saveBtn=document.getElementById("save");

let editingTaskId=null;

addBtn.addEventListener("click",()=>{
editingTaskId=null;
    document.getElementById("taskMessage").textContent="";
document.getElementById("modalTitle").textContent="Add Task";
saveBtn.textContent="Add Task";
document.getElementById("taskName").value="";
document.getElementById("subject").value="";
document.getElementById("taskDate").value=todayDate;
document.getElementById("priority").value="Medium";
    openDialog(modal,addBtn);
});

closeBtn.addEventListener("click",()=>{
closeModal();
});

modal.addEventListener("click",e=>{
if(e.target===modal){
closeModal();
}
});

function closeModal(){
 closeDialog(modal);
editingTaskId=null;
document.getElementById("modalTitle").textContent="Add Task";
saveBtn.textContent="Add Task";
}

saveBtn.addEventListener("click",()=>{
const name=document.getElementById("taskName").value.trim();
const subject=document.getElementById("subject").value.trim();
const date=document.getElementById("taskDate").value;
const priority=document.getElementById("priority").value;
const taskMessage=document.getElementById("taskMessage");
taskMessage.textContent="";

if(name===""){
taskMessage.textContent="Please enter a task name.";
document.getElementById("taskName").focus();
return;
}

if(date===""){
taskMessage.textContent="Please select a due date.";
document.getElementById("taskDate").focus();
return;
}

if(editingTaskId!==null){
const task=tasks.find(task=>task.id===editingTaskId);

if(!task){
return;
}

task.name=name;
task.subject=subject||"General";
task.date=date;
task.priority=priority;
}else{
tasks.push({
id:Date.now(),
name:name,
subject:subject||"General",
priority:priority,
date:date,
done:false,
completedDate:null
});
}

localStorage.setItem("focusRootTasks",JSON.stringify(tasks));

closeModal();
renderTasks();
updateTimerTasks();
updateWeeklyProgress();
updateStats();
});

[document.getElementById("taskName"),document.getElementById("taskDate")].forEach(input=>{
    input.addEventListener("input",()=>{
        document.getElementById("taskMessage").textContent="";
    });
});

function renderTasks(){
const taskList=document.getElementById("taskList");
const pendingList=document.getElementById("pendingList");
const allTasks=document.getElementById("allTasks");

taskList.innerHTML="";
pendingList.innerHTML="";
allTasks.innerHTML="";

const todayTasks=tasks.filter(task=>task.date===todayDate);
const pendingTasks=tasks.filter(task=>task.date<todayDate&&!task.done);

if(todayTasks.length===0){
taskList.innerHTML='<div class="empty">No tasks for today.</div>';
}

todayTasks.forEach(task=>{
taskList.appendChild(createTaskElement(task));
});

pendingTasks.forEach(task=>{
pendingList.appendChild(createTaskElement(task));
});

if(tasks.length===0){
allTasks.innerHTML='<div class="empty">No tasks yet. Add your first task!</div>';
}else{
tasks.forEach(task=>{
allTasks.appendChild(createTaskElement(task));
});
}

updateStats();
}

function createTaskElement(task){
const div=document.createElement("div");
div.className="task";

if(task.done){
div.classList.add("done");
}

div.innerHTML=`
<div>
<b>${task.name}</b>
<small>${task.subject} · ${task.priority}</small>
</div>
<div class="task-actions">
<button class="complete-btn">${task.done?"✓":"○"}</button>
<button class="edit-btn">✏</button>
<button class="delete-btn">🗑</button>
</div>
<span>+10 XP</span>
`;

div.querySelector(".complete-btn").addEventListener("click",()=>{
completeTask(task.id);
});

div.querySelector(".edit-btn").addEventListener("click",()=>{
editTask(task.id);
});

div.querySelector(".delete-btn").addEventListener("click",()=>{
deleteTask(task.id);
});

return div;
}

function completeTask(id){
const task=tasks.find(task=>task.id===id);

if(!task){
return;
}

task.done=!task.done;

if(task.done){
task.completedDate=getToday();
}else{
task.completedDate=null;
}

localStorage.setItem("focusRootTasks",JSON.stringify(tasks));

renderTasks();
updateTimerTasks();
updateWeeklyProgress();
updateStats();
}

function editTask(id){
const task=tasks.find(task=>task.id===id);

if(!task){
return;
}

editingTaskId=id;
document.getElementById("modalTitle").textContent="Edit Task";
saveBtn.textContent="Update Task";
document.getElementById("taskName").value=task.name;
document.getElementById("subject").value=task.subject;
document.getElementById("taskDate").value=task.date;
document.getElementById("priority").value=task.priority;
document.getElementById("taskMessage").textContent="";
openDialog(modal,document.activeElement);
}

function deleteTask(id){
if(!confirm("Delete this task?")){
return;
}

tasks=tasks.filter(task=>task.id!==id);
localStorage.setItem("focusRootTasks",JSON.stringify(tasks));

renderTasks();
updateTimerTasks();
updateWeeklyProgress();
updateStats();
}

function getWeekKey(){
const date=new Date();
const day=date.getDay();
const monday=new Date(date);

monday.setDate(date.getDate()-(day===0?6:day-1));

return monday.getFullYear()+"-"+String(monday.getMonth()+1).padStart(2,"0")+"-"+String(monday.getDate()).padStart(2,"0");
}

let focusSessions=JSON.parse(localStorage.getItem("focusRootSessions"))||[];

localStorage.setItem("focusRootSessions",JSON.stringify(focusSessions));

function getPlant(duration,forfeited){
if(forfeited){
return "🥀";
}
if(duration===1)return "🌱";
if(duration===5)return "🌱";
if(duration===15)return "🌱";
if(duration===25)return "🌿";
if(duration===45)return "🌻";
if(duration===60)return "🌳";

return "🌱";
}

function updateGarden(){
const garden=document.getElementById("gardenPlants");
const bigGarden=document.getElementById("bigGardenPlants");
const week=getWeekKey();

const weekSessions=focusSessions.filter(session=>session.week===week);

if(garden){
garden.innerHTML="";
}

if(bigGarden){
bigGarden.innerHTML="";
}

if(weekSessions.length===0){
if(garden)garden.innerHTML="🌱";
if(bigGarden)bigGarden.innerHTML="🌱";
updateGardenPercentage();
return;
}

weekSessions.forEach(session=>{
const plant=document.createElement("span");
plant.textContent=session.plant;

if(garden){
garden.appendChild(plant.cloneNode(true));
}

if(bigGarden){
bigGarden.appendChild(plant.cloneNode(true));
}
});

updateGardenPercentage();
}

function updateGardenPercentage(){
const percent=document.getElementById("gardenPercent");
const progress=document.getElementById("gardenProgress");

if(!percent||!progress){
return;
}

const week=getWeekKey();
const sessions=focusSessions.filter(session=>session.week===week);

if(sessions.length===0){
percent.textContent="0%";
progress.style.width="0%";
return;
}

const completed=sessions.filter(session=>session.status==="completed").length;
const value=Math.round((completed/sessions.length)*100);

percent.textContent=value+"%";
progress.style.width=value+"%";
}

function updateTimerTasks(){
    const timerTask=document.getElementById("timerTask");
    const currentValue=timerTask.value;

    timerTask.innerHTML=`<option value="">Choose today's task</option>`;

    const availableTasks=tasks.filter(task=>
        !task.done&&(task.date===getToday()||task.date<getToday())
    );

    availableTasks.forEach(task=>{
        const option=document.createElement("option");

        option.value=task.id;

        option.textContent=
            (task.date<getToday()?"[Pending] ":"[Today] ")+
            task.name+
            (task.date<getToday()?" · Due "+task.date:"");

        timerTask.appendChild(option);
    });

    if(availableTasks.some(task=>String(task.id)===currentValue)){
        timerTask.value=currentValue;
    }
}

const timerTask=document.getElementById("timerTask");
const timerDuration=document.getElementById("timerDuration");
const time=document.getElementById("time");
const start=document.getElementById("start");
const reset=document.getElementById("reset");
const forfeit=document.getElementById("forfeit");
const timerMessage=document.getElementById("timerMessage");

let timeLeft=Number(timerDuration.value)*60;
let timer=null;

function lockTimer(){
timerTask.disabled=true;
timerDuration.disabled=true;
}

function unlockTimer(){
timerTask.disabled=false;
timerDuration.disabled=false;
}

timerDuration.addEventListener("change",()=>{
if(timer!==null){
return;
}

timeLeft=Number(timerDuration.value)*60;
updateTimer();
});

function updateTimer(){
const minutes=Math.floor(timeLeft/60);
const seconds=timeLeft%60;

time.textContent=String(minutes).padStart(2,"0")+":"+String(seconds).padStart(2,"0");
}

start.addEventListener("click",()=>{
if(timer!==null){
clearInterval(timer);
timer=null;
start.textContent="Start Focus";
return;
}

if(timerTask.value===""){
alert("Please select a task first.");
return;
}

lockTimer();
forfeit.disabled=false;
start.textContent="Pause";

timer=setInterval(()=>{
timeLeft--;
updateTimer();

if(timeLeft<=0){
clearInterval(timer);
timer=null;

const selectedTask=tasks.find(task=>task.id===Number(timerTask.value));

if(selectedTask){
selectedTask.done=true;
selectedTask.completedDate=getToday();

const duration=Number(timerDuration.value);

focusSessions.push({
taskId:selectedTask.id,
duration:duration,
status:"completed",
plant:getPlant(duration,false),
date:getToday(),
week:getWeekKey()
});

localStorage.setItem("focusRootSessions",JSON.stringify(focusSessions));

timerMessage.textContent="Focus session completed! You earned "+duration+" XP 🌱";

updateGarden();
}

localStorage.setItem("focusRootTasks",JSON.stringify(tasks));

start.textContent="Start Focus";
forfeit.disabled=true;
unlockTimer();

renderTasks();
updateTimerTasks();
updateStats();
updateWeeklyProgress();
resetTimer();
}
},1000);
});

reset.addEventListener("click",()=>{
clearInterval(timer);
timer=null;
resetTimer();
unlockTimer();
forfeit.disabled=true;
start.textContent="Start Focus";
timerMessage.textContent="";
});

forfeit.addEventListener("click",()=>{
if(timer===null){
return;
}

clearInterval(timer);
timer=null;

const selectedTask=timerTask.value;
const duration=Number(timerDuration.value);

if(selectedTask){
focusSessions.push({
taskId:Number(selectedTask),
duration:duration,
status:"forfeited",
plant:getPlant(duration,true),
date:getToday(),
week:getWeekKey()
});

localStorage.setItem("focusRootSessions",JSON.stringify(focusSessions));

updateGarden();
updateStats();
}

timerMessage.textContent="Focus session forfeited. A dead plant was added 🥀";

resetTimer();
unlockTimer();
forfeit.disabled=true;
start.textContent="Start Focus";
});

function resetTimer(){
timeLeft=Number(timerDuration.value)*60;
updateTimer();
}

function updateStreak(){
const completedDates=new Set(
tasks.filter(task=>task.done&&task.completedDate).map(task=>task.completedDate)
);

let streak=0;
let date=new Date();

while(true){
const dateString=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");

if(!completedDates.has(dateString)){
break;
}

streak++;
date.setDate(date.getDate()-1);
}

document.getElementById("streak").textContent=streak+" Day"+(streak===1?"":"s");
}

function updateFocusTime(){
const element=document.getElementById("focusTime");
const week=getWeekKey();

const minutes=focusSessions
.filter(session=>session.week===week&&session.status==="completed")
.reduce((total,session)=>total+session.duration,0);

const hours=Math.floor(minutes/60);
const mins=minutes%60;

if(hours>0){
element.textContent=hours+"h "+mins+"m";
}else{
element.textContent=mins+"m";
}
}

function updateXP(){
const completed=tasks.filter(task=>task.done).length;
const completedSessionXP=focusSessions
    .filter(session=>session.status==="completed")
    .reduce((total,session)=>total+Number(session.duration||0),0);
const xp=completed*10+completedSessionXP;
const level=Math.floor(xp/100)+1;
const nextLevel=100-(xp%100);

document.getElementById("xp").textContent=xp;
document.getElementById("profileLevel").textContent="Level "+level;

if(xp===0){
document.getElementById("nextLevel").textContent="100 to next level";
}else{
document.getElementById("nextLevel").textContent=nextLevel+" to next level";
}
}

function updateStats(){
const completed=tasks.filter(task=>task.done).length;

document.getElementById("done").textContent=completed;

updateXP();
updateStreak();
updateFocusTime();
updateGardenPercentage();
}

function updateWeeklyProgress(){
const bars=document.getElementById("weeklyBars");
const days=document.getElementById("weeklyDays");

if(!bars||!days){
return;
}

bars.innerHTML="";
days.innerHTML="";

const today=new Date();
const day=today.getDay();
const monday=new Date(today);

monday.setDate(today.getDate()-(day===0?6:day-1));

const dayNames=["M","T","W","T","F","S","S"];

for(let i=0;i<7;i++){
const currentDate=new Date(monday);
currentDate.setDate(monday.getDate()+i);

const dateString=currentDate.getFullYear()+"-"+String(currentDate.getMonth()+1).padStart(2,"0")+"-"+String(currentDate.getDate()).padStart(2,"0");

const dayTasks=tasks.filter(task=>task.date===dateString);
const completedTasks=dayTasks.filter(task=>task.done);

let progress=0;

if(dayTasks.length>0){
progress=Math.round((completedTasks.length/dayTasks.length)*100);
}

const bar=document.createElement("i");

bar.style.height=progress===0?"4px":progress+"%";
bar.title=progress+"% completed";

bars.appendChild(bar);

const dayLabel=document.createElement("span");
dayLabel.textContent=dayNames[i];
days.appendChild(dayLabel);
}
}

document.getElementById("showSignup").addEventListener("click",()=>{
    loginForm.hidden=true;
    signupForm.hidden=false;
    setAuthMessage("");
});

document.getElementById("showLogin").addEventListener("click",()=>{
    signupForm.hidden=true;
    loginForm.hidden=false;
    setAuthMessage("");
});

[...loginForm.querySelectorAll("input"),...signupForm.querySelectorAll("input")].forEach(input=>{
    input.addEventListener("input",()=>setAuthMessage(""));
});

signupForm.addEventListener("submit",e=>{
    e.preventDefault();

    const name=document.getElementById("signupName").value.trim();
    const email=document.getElementById("signupEmail").value.trim().toLowerCase();
    const password=document.getElementById("signupPassword").value;
    const confirmPassword=document.getElementById("confirmPassword").value;

    if(!name||!email||!password||!confirmPassword){
        setAuthMessage("Please fill in every field.");
        return;
    }

    if(!/^\S+@\S+\.\S+$/.test(email)){
        setAuthMessage("Enter a valid email address.");
        return;
    }

    if(password.length<6){
        setAuthMessage("Password must contain at least 6 characters.");
        return;
    }

    if(password!==confirmPassword){
        setAuthMessage("Passwords do not match.");
        return;
    }

    const users=JSON.parse(localStorage.getItem("focusRootUsers"))||[];

    if(users.some(item=>item.email===email)){
        setAuthMessage("An account with this email already exists.");
        return;
    }

    const user={name,email,password};

    users.push(user);

    localStorage.setItem("focusRootUsers",JSON.stringify(users));

    loginForm.hidden=false;
    signupForm.hidden=true;
    document.getElementById("loginEmail").value=email;
    document.getElementById("loginPassword").value="";
    setAuthMessage("Account created. Please log in to continue.","success");
});

loginForm.addEventListener("submit",e=>{
    e.preventDefault();

    const email=document.getElementById("loginEmail").value.trim().toLowerCase();
    const password=document.getElementById("loginPassword").value;

    const users=JSON.parse(localStorage.getItem("focusRootUsers"))||[];

    const user=users.find(item=>item.email===email&&item.password===password);

    if(!user){
        setAuthMessage("Email or password is incorrect. If you are new, please sign up.");
        return;
    }

    setAuthMessage("");
    enterApp(user);
});

function enterApp(user){
    profile={name:user.name,email:user.email};

    localStorage.setItem("focusRootProfile",JSON.stringify(profile));
    localStorage.setItem("focusRootLoggedIn",user.email);

    showProfile();

    authPage.hidden=true;
    app.hidden=false;

    updateStats();
}

document.getElementById("logoutBtn").addEventListener("click",()=>{
    localStorage.removeItem("focusRootLoggedIn");

    profileDetailsModal.classList.remove("show");
    app.hidden=true;
    authPage.hidden=false;

    loginForm.hidden=false;
    signupForm.hidden=true;

    setAuthMessage("You have logged out.","success");
});

renderTasks();
updateTimerTasks();
updateTimer();
updateGarden();
updateGardenPercentage();
updateStats();
updateWeeklyProgress();
forfeit.disabled=true;
localStorage.removeItem("focusRootLoggedIn");
authPage.hidden=false;
app.hidden=true;
