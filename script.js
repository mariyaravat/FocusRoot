const navButtons=document.querySelectorAll(".nav");
const pages=document.querySelectorAll(".page");
const app=document.getElementById("app");
const authPage=document.getElementById("authPage");
const loginForm=document.getElementById("loginForm");
const signupForm=document.getElementById("signupForm");
const authMessage=document.getElementById("authMessage");

const legacyBrowserData={
    tasks:JSON.parse(localStorage.getItem("focusRootTasks")||"[]"),
    sessions:JSON.parse(localStorage.getItem("focusRootSessions")||"[]"),
    profile:JSON.parse(localStorage.getItem("focusRootProfile")||"null")
};
let csrfToken="";

async function api(path,{method="GET",body}={}){
    if(!csrfToken){
        let tokenResponse;
        try{tokenResponse=await fetch("/api/csrf/",{credentials:"same-origin"});}
        catch(error){
            if(error instanceof TypeError)throw new Error("Open FocusRoot with run_focusroot.bat so Django can provide the backend.");
            throw error;
        }
        const tokenData=await tokenResponse.json();
        csrfToken=tokenData.csrfToken;
    }
    const headers={"Accept":"application/json"};
    if(body!==undefined)headers["Content-Type"]="application/json";
    if(method!=="GET")headers["X-CSRFToken"]=csrfToken;
    let response;
    try{
        response=await fetch(path,{method,credentials:"same-origin",headers,body:body===undefined?undefined:JSON.stringify(body)});
    }catch(error){
        if(error instanceof TypeError){
            throw new Error("Cannot reach the FocusRoot backend. Start Django with `python manage.py runserver`, then open http://127.0.0.1:8000/.");
        }
        throw error;
    }
    const data=await response.json().catch(()=>({error:"The server returned an unreadable response."}));
    if(data.csrfToken)csrfToken=data.csrfToken;
    if(!response.ok)throw new Error(data.error||"The request could not be completed.");
    return data;
}

function showAuthError(error){setAuthMessage(error.message||"Could not connect to FocusRoot. Please try again.");}

async function loadAccountData(){
    const [profileData,taskData,sessionData]=await Promise.all([
        api("/api/profile/"),api("/api/tasks/"),api("/api/sessions/")
    ]);
    profile=profileData;
    tasks=taskData.tasks;
    focusSessions=sessionData.sessions;
    showProfile();
    renderTasks();updateTimerTasks();updateGarden();updateStats();updateWeeklyProgress();
}

async function offerBrowserImport(){
    if(!legacyBrowserData.tasks.length&&!legacyBrowserData.sessions.length)return;
    const marker="focusRootImportOffered";
    if(localStorage.getItem(marker)==="done")return;
    const priorEmail=legacyBrowserData.profile?.email;
    const accountNote=priorEmail?` The saved profile was ${priorEmail}.`:"";
    const shouldImport=confirm(`Found ${legacyBrowserData.tasks.length} saved task(s) and ${legacyBrowserData.sessions.length} focus session(s) in this browser.${accountNote}\n\nImport them into this account? Your browser copy will remain as a backup.`);
    localStorage.setItem(marker,"done");
    if(!shouldImport)return;
    try{
        const result=await api("/api/import/local/",{method:"POST",body:{tasks:legacyBrowserData.tasks,sessions:legacyBrowserData.sessions}});
        await loadAccountData();
        setAuthMessage(result.alreadyImported?"Browser data was already imported into this account.":`Imported ${result.tasks} task(s) and ${result.sessions} focus session(s).`,"success");
    }catch(error){
        localStorage.removeItem(marker);
        setAuthMessage(error.message);
    }
}

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

let profile={name:"",email:""};

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

    saveProfileBtn.disabled=true;
    api("/api/profile/",{method:"PATCH",body:{name,email}}).then(updated=>{
        profile=updated;showProfile();
        document.getElementById("profileDetailsMessage").textContent="Profile saved successfully.";
        closeProfileModal();
    }).catch(error=>{profileMessage.textContent=error.message;profileMessage.classList.remove("success-message");})
      .finally(()=>saveProfileBtn.disabled=false);
});

let tasks=[];

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

saveBtn.addEventListener("click",async()=>{
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

try{
    if(editingTaskId!==null){
        const updated=await api(`/api/tasks/${editingTaskId}/`,{method:"PATCH",body:{name,subject:subject||"General",date,priority}});
        tasks=tasks.map(task=>task.id===updated.id?updated:task);
    }else{
        const created=await api("/api/tasks/",{method:"POST",body:{name,subject:subject||"General",date,priority}});
        tasks.push(created);
    }
}catch(error){taskMessage.textContent=error.message;return;}

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

async function completeTask(id){
const task=tasks.find(task=>task.id===id);

if(!task){
return;
}

try{
    const updated=await api(`/api/tasks/${id}/`,{method:"PATCH",body:{done:!task.done,completedDate:!task.done?getToday():null}});
    tasks=tasks.map(item=>item.id===id?updated:item);
}catch(error){alert(error.message);return;}

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

async function deleteTask(id){
if(!confirm("Delete this task?")){
return;
}

try{await api(`/api/tasks/${id}/`,{method:"DELETE"});}
catch(error){alert(error.message);return;}
tasks=tasks.filter(task=>task.id!==id);

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

let focusSessions=[];

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

timer=setInterval(async()=>{
timeLeft--;
updateTimer();

if(timeLeft<=0){
clearInterval(timer);
timer=null;

const selectedTask=tasks.find(task=>task.id===Number(timerTask.value));
if(selectedTask){
const duration=Number(timerDuration.value);
try{
    const result=await api("/api/sessions/",{method:"POST",body:{taskId:selectedTask.id,duration,status:"completed"}});
    focusSessions.unshift(result.session);
    tasks=tasks.map(task=>task.id===result.task.id?result.task:task);
    timerMessage.textContent="Focus session completed! You earned "+duration+" XP 🌱";
}catch(error){timerMessage.textContent=error.message;}
updateGarden();
}

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
    api("/api/sessions/",{method:"POST",body:{taskId:Number(selectedTask),duration,status:"forfeited"}})
      .then(result=>{focusSessions.unshift(result.session);updateGarden();updateStats();})
      .catch(error=>{timerMessage.textContent=error.message;});
}

if(selectedTask)timerMessage.textContent="Focus session forfeited. A dead plant was added 🥀";

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

signupForm.addEventListener("submit",async e=>{
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

    if(password.length<8){setAuthMessage("Password must contain at least 8 characters.");return;}

    if(password!==confirmPassword){
        setAuthMessage("Passwords do not match.");
        return;
    }

    try{
        await api("/api/auth/signup/",{method:"POST",body:{name,email,password}});
        loginForm.hidden=false;signupForm.hidden=true;
        document.getElementById("loginEmail").value=email;
        document.getElementById("loginPassword").value="";
        setAuthMessage("Account created. Please log in to continue.","success");
    }catch(error){showAuthError(error);}
});

loginForm.addEventListener("submit",async e=>{
    e.preventDefault();

    const email=document.getElementById("loginEmail").value.trim().toLowerCase();
    const password=document.getElementById("loginPassword").value;

    try{
        await api("/api/auth/login/",{method:"POST",body:{email,password}});
        await enterApp();
    }catch(error){showAuthError(error);}
});

async function enterApp(){
    try{
        await loadAccountData();
        authPage.hidden=true;app.hidden=false;setAuthMessage("");
        await offerBrowserImport();
        renderTasks();updateTimerTasks();updateGarden();updateStats();updateWeeklyProgress();
    }catch(error){showAuthError(error);}
}

document.getElementById("logoutBtn").addEventListener("click",async()=>{
    try{await api("/api/auth/logout/",{method:"POST"});}
    catch(error){document.getElementById("profileDetailsMessage").textContent=error.message;return;}

    profileDetailsModal.classList.remove("show");
    app.hidden=true;
    authPage.hidden=false;

    loginForm.hidden=false;
    signupForm.hidden=true;

    setAuthMessage("You have logged out.","success");
});

updateTimer();
forfeit.disabled=true;
authPage.hidden=false;
app.hidden=true;
if(location.protocol==="file:")setAuthMessage("To use Django accounts and SQLite, start FocusRoot with run_focusroot.bat. Opening this file directly cannot start the backend.");
