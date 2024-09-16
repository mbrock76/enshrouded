function init(){

    // -- VARIABLES --
    let scale = 1;
    let isDragging = false;
    const dragPos = {x:0,y:0};
    const transPos = {x:0,y:0};
	const mousePos = {x:0,y:0};
    const lines = Array.from(document.getElementById("lineGroup").children);
    var dfsNodes = [];

    let user = {
        "name": "",
        "builds": {}
    };

    let build = {
        "username": "",
        "buildname": "",
        "nodes": {},
        "points": 114
    };

    const colors = ["#444444", "#3C6DB6", "#4A85AC", "#54A2A2", "#59A98D", "#59A86C", "#6B8E23", "#AAAA14", "#d1aa18",
                    "#d98a09", "#d66510", "#db421f", "#C13C64", "#903983", "#7444B1", "#5D52B9", "#445DBD", "#ffee99"];

    // initialize the svg element
	const svg = document.getElementById("mySvg");
    const svgGroup = document.getElementById("svgGroup");
    let rect = svg.getBoundingClientRect();

    transPos.x = rect.width / 2;
    transPos.y = rect.height / 2;
    updateTransform();

    document.getElementById("nodeInfo").style.display = "none";
	
    // pulls the node object from a text file, to keep this js readable 
	fetch(`scripts/builds/nodes.txt?${new Date().getTime()}`)
    .then(response => response.json())
    .then(text  => {
        build.nodes = text;
    });

    // check for parameters and load build if needed
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    
    if(urlParams.has('username') && urlParams.has('buildname')){

        loadBuild(urlParams.get('username'), urlParams.get('buildname'));
    }


	// -- EVENT LISTENERS --

    // the svg node tree
    svg.addEventListener("wheel", zoomSvg);
    svg.addEventListener("mousedown", startDrag);
    svg.addEventListener("mousemove", getMousePos);
    svg.addEventListener("mouseup", endDrag);
    svg.addEventListener("mouseleave", endDrag);

    Array.from(document.getElementsByClassName("info")).forEach(each => {

        each.addEventListener("mouseover", showNodeInfo);
        each.addEventListener("mouseout", hideNodeInfo);

        if(each.classList.contains("nodes")){
            each.addEventListener("click", clickNode);
            each.addEventListener("contextmenu", clickNode);
        }
    });

    // selections layer element
    document.getElementById("selections-layer").addEventListener("click", closeSelection);
    document.getElementById("selections-select").addEventListener("click", submitSelection);

    // ui:
    // logged out state:
    document.getElementById("username").addEventListener("input", valInput);
    document.getElementById("password").addEventListener("input", valInput);
    document.getElementById("login").addEventListener("click", loginRegister);
    document.getElementById("register").addEventListener("click", loginRegister);

    // logged in state:
    document.getElementById("logout").addEventListener("click", logout);
    document.getElementById("newbuild").addEventListener("mousedown", toggleNewBuildInput);
    document.getElementById("buildname").addEventListener("input", valInput);
    document.getElementById("buildname").addEventListener("keypress", toggleNewBuildInput);
    document.getElementById("link").addEventListener("click", copyLink);
    document.getElementById("load-build").addEventListener("click", loadBuild);
    document.getElementById("clear-build").addEventListener("click", clearBuild);
    document.getElementById("save-build").addEventListener("click", saveBuild);
    document.getElementById("delete-build").addEventListener("click", deleteBuild);

    // search box
    document.getElementById("searchbox").addEventListener("input", highlightNodes);
    document.getElementById("clearsearch").addEventListener("click", clearSearch);


    // -- FUNCTIONS --

    // hides child elements
    function hideChildren(myId){

		const children = Array.from(document.getElementById(myId).children);

		children.forEach(function(each){
			each.style.display = "none";
		});
	}

    // read in a json nodes file
    async function fetchBuildData(buildId) {

        try {

            const response = await fetch(`scripts/builds/${buildId}.txt?${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error('Error fetching build data');
            }
            const build = await response.json();
            return build;  // Return the fetched build data

        } catch (error) {

            console.error('Failed to fetch build data:', error);
            return {};  // Return an empty object on error
        }
    }

    // clicking outside the selections box will close and hide the layer without continuing with the node click process
    function closeSelection(e){

        if(e.target.id === "selections-layer"){

            document.getElementById("selections-list").innerHTML = "";
            document.getElementById("selections-layer").style.display = "none";
        }
        
    }

    // record selection to the node, change the svg node, close layer
    function submitSelection(){

        // get data/elements
        const nodeId = document.getElementById("selections-select").dataset.node;
        const myNode = document.getElementById(nodeId);
        const mySelection = document.getElementById("selections-list");

        // record the changes to the nodes object
        build.nodes[nodeId].selection = mySelection.value;
        build.nodes[nodeId].points += build.nodes[nodeId].increment;

        // record point change in ui
        build.points -= build.nodes[nodeId].increment;
        document.getElementById("buildpoints").innerText = build.points;

        // color the svg node
        myNode.setAttribute('fill', `${colors[build.nodes[nodeId].color]}ee`);

        // change the link colors
        colorLines(nodeId);

        // close layer
        document.getElementById("selections-list").innerHTML = "";
        document.getElementById("selections-layer").style.display = "none";
    }

    // sanitize input and feed it back
	function valInput(e){
		
		let temp = document.getElementById(e.target.id).value.replace(/[^a-z0-9_]/gi, "");
		document.getElementById(e.target.id).value = temp;
	}

    // display a server message briefly
    function showMessage(message){

        const messageBox = document.getElementById("message");
        messageBox.innerHTML = message;

        messageBox.classList.add('visible');

        setTimeout(() => {
            messageBox.classList.remove('visible');
        }, 2000);
    }

    // searches the nodes text for words and highlights them if found
    function highlightNodes(){

        // get the user input from the text box
        const text = document.getElementById("searchbox").value;
        
        // iterate through the nodes objects
        for (const [key, value] of Object.entries(build.nodes)){

            if(!key.includes("00")){

                document.getElementById(`${key}-border`).setAttribute('stroke', (!text || !value.text.toLowerCase().includes(text)) ? "#ffee9900" : "#ffee99cc");
            }
        }
    }

    // clear the search bar
    function clearSearch(){

        document.getElementById("searchbox").value = "";
        highlightNodes();
    }

    // Login or register
    function loginRegister(e) {

        // get the username and password and create an object
        const elements = Array.from(document.getElementsByClassName("credentials"));
        const credentials = elements.reduce((obj, element) => {
            obj[element.id] = element.value;
            return obj;
        }, {});

        // add an action for the php script
        credentials["action"] = e.target.id;

        // send credentials to the server script
        fetch('scripts/login_register.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {

                // set user object
                user = data.user;
                
                // Convert user.builds (object) to an array of objects
                user.builds = Object.entries(user.builds).map(([key, value]) => ({
                    build: key,
                    id: value.id,
                    points: value.points
                }));
                
                // populate user name
                document.getElementById("name").innerText = user.name;

                // populate the select element options
                const builds = document.getElementById("builds");

                user.builds.forEach(each => {

                    builds.insertAdjacentHTML("afterbegin", `<option class="userbuilds" data-id="${each.id}" value="${each.build}">${each.build}</option>`);
                });

                // reset the input fields
                elements.forEach(each => {
                    each.value = "";
                });

                // swap visibility of ui elements
                hideChildren("ui");
                document.getElementById("loggedin").style.display = "block";

                showMessage(`Welcome ${user.name}.`);
                
            } else {
                // Handle errors or failed attempts
                showMessage(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    // logs the user out, and removes save state from browser storage
    function logout(){

        // scrub username
        document.getElementById("name").innerText = "";

        // get the options that aren't newbuild and remove them
        const userbuilds = Array.from(document.getElementsByClassName("userbuilds"));

        userbuilds.forEach(each => {
            each.remove();
        })

        // toggle ui
        hideChildren("ui");
        document.getElementById("loggedout").style.display = "block";
    }

    // switch between the drop down menu of build names and the build name input field
    function toggleNewBuildInput(e){
        
        const builds = document.getElementById("builds");
        const buildname = document.getElementById("buildname");

        // if called by selecting the new build option:
        if(e.target.id === "newbuild" && e.target.value === "newbuild"){

            builds.style.display = "none";
            buildname.style.display = "block";

        }else if(e.target.id === "buildname" && e.key === "Enter"){

            builds.insertAdjacentHTML("afterbegin", `<option class="userbuilds" value="${buildname.value}">${buildname.value}</option>`);
            builds.value = buildname.value;
            buildname.value = "";

            builds.style.display = "block";
            buildname.style.display = "none";
        }
    }

    // forms and copies a link to the clipboard
    function copyLink(){

        // check if its on new build first
        buildname = document.getElementById("builds").value

        if(buildname == "newbuild"){
            showMessage("Select a build first.");
        }else{

            navigator.clipboard.writeText(`localhost/paulallen.tech/enshrouded/?username=${user.name}&buildname=${buildname}`);
            showMessage("Link copied.");
        }
    }

    // clear the current build, resetting nodes and refunding points
    function clearBuild(){

        build.points = 114;
        document.getElementById("buildpoints").innerHTML = build.points;
        const myNodes = Object.keys(build.nodes);
        
        // could have just re-fetched from the text file but you are also getting the node color task here too so
        myNodes.forEach(each => {

            if(!each.includes("00")){

                document.getElementById(each).setAttribute('fill', colors[0]);
                build.nodes[each].points = 0;
                build.nodes[each].selection = "";

            }
        });

        const myLinks = Array.from(document.getElementById("lineGroup").children);

        myLinks.forEach(each => {

            each.setAttribute('stroke', "#444444cc");
        });
    }

    // save build to current selection
    function saveBuild(){

        const myBuildName = document.getElementById("builds").value;

        // filter out the situation where it is set on "new build?", this should only be possible when they first log in
        if(myBuildName == "newbuild"){

            alert("Please select or name a build.");

        }else{

            build.username = user.name;
            build.buildname = myBuildName;

            fetch('scripts/save_build.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(build),
            })
            .then(response => response.json())
            .then(data => {
                
                showMessage(data.message);
            })
            .catch(error => console.error('Error:', error));
        }
    }
    
    // remove a build from the list and its db entry and corresponding file
    function deleteBuild(){

        const myBuilds = document.getElementById("builds");

        // filter out the situation where it is set on "new build?", this should only be possible when they first log in
        if(myBuilds.value == "newbuild"){

            alert("lol, no.");

        }else{

            build.username = user.name;
            build.buildname = myBuilds.value;

            fetch('scripts/delete_build.php', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(build),
            })
            .then(response => response.json())
            .then(data => {
                
                if (data.status) {

                    // handle post success actions
                    showMessage(data.message);
                    myBuilds.querySelector(`option[value="${myBuilds.value}"]`).remove();
                    build.buildname = "";
                    
                } else {
                    // Handle errors or failed attempts
                    showMessage(data.message);
                }
            })
            .catch(error => console.error('Error:', error));
        }
    }

    // send username and buildname to the server, it returns a completed build object
    async function loadBuild(username = null, buildname = null) {
    
        // Check if the function was called without username or buildname
        if (!username || !buildname) {
    
            // Called via click event, get the build name from the DOM
            const buildsElement = document.getElementById("builds");
            buildname = buildsElement.options[buildsElement.selectedIndex].value;
            username = user.name;
        }

        // wait for the fetch to complete
        build = await fetchBuildData(username, buildname);

        // null check
        if (!build || !build.nodes || typeof build.nodes !== 'object') {
            
            console.error('Failed to load build or invalid build data.');
            return;
        }else{

            showMessage(`Build ${build.buildname} loaded.`);
        }

        // iterate through the nodes as if they were being clicked
        for (const [key, value] of Object.entries(build.nodes)) {

            // ignore starter nodes, which have a point in them for the depth first search to function
            if(!key.includes("00")){

                document.getElementById(key).setAttribute('fill', (value.points > 0) ? `${colors[value.color]}ee` : "#444444");

                // skip the center nodes
                if(!key.includes("non")){
                    colorLines(key);
                }
            }
        }

        // update the ui with the points total
        document.getElementById("buildpoints").innerText = build.points;
    }

    // needed for loadbuild, otherwise it iterates over the previous build
    async function fetchBuildData(username, buildname) {

        try {

            // Send username and buildname to the PHP script
            const response = await fetch('scripts/load_build.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    buildname: buildname
                })
            });
    
            // Check if the response is ok
            if (!response.ok) {
                throw new Error('Error fetching build data');
            }
    
            const data = await response.json();
    
            // Handle the build data
            if (data.status === true) {

                const build = data.build;
                console.log("Build data fetched successfully:", data);
                return build;

            } else {

                showMessage(data.message);
                return null;
            }

        } catch (error) {

            showMessage("Error.");
            console.error('Failed to fetch build data:', error);
            return null;
        }
    }
    

    // handle left and right click events for the nodes, adds or removes points
    function clickNode(e) {

        e.preventDefault();

        const textbox = document.getElementById("nodeInfo");
        const myNode = document.getElementById(e.target.id);

        // left click:
        if(e.button === 0 
            && build.nodes[e.target.id].increment <= build.points 
            && build.nodes[e.target.id].points != build.nodes[e.target.id].max
            && (e.target.id.includes("non") || build.nodes[e.target.id].links.some(id => build.nodes[id].points != 0))){

            // if the node has choices set up the selections layer and divert flow to that
            if(build.nodes[e.target.id].selections){
                
                // stash the node id in the html for the submitSelection function
                document.getElementById("selections-select").dataset.node = e.target.id;

                // populate the drop down menu
                const mySelection = document.getElementById("selections-list");

                build.nodes[e.target.id].selections.forEach(each => {

                    mySelection.insertAdjacentHTML("beforeend", `<option value="${each}">${each}</option>`);
                });
                
                document.getElementById("selections-layer").style.display = "flex";

            }else{

                myNode.setAttribute('fill', `${colors[build.nodes[e.target.id].color]}ee`);
                build.nodes[e.target.id].points += build.nodes[e.target.id].increment;
                build.points -= build.nodes[e.target.id].increment;
                document.getElementById("buildpoints").innerText = build.points;
                colorLines(e.target.id);
            }

        // right click
        }else if(e.button === 2 && build.nodes[e.target.id].points != 0){

            build.nodes[e.target.id].points -= build.nodes[e.target.id].increment;
            build.points += build.nodes[e.target.id].increment;
            colorLines(e.target.id);

            if(build.nodes[e.target.id].points == 0){

                myNode.setAttribute('fill', colors[0]);
                build.nodes[e.target.id].selection = "";

                build.nodes[e.target.id].links.forEach( link => {

                    dfsNodes = [];

                    // start the depth first search, if it doesnt find the root node, refund the node branch
                    if(link.includes("00")){
                        return;
                    }else if(!findRoot(link)){
                        
                        dfsNodes.forEach( node => {

                            document.getElementById(node).setAttribute('fill', colors[0]);
                            build.points += build.nodes[node].points;
                            build.nodes[node].points = 0;
                            build.nodes[node].selection = "";
                            colorLines(node);

                        });
                    }
                });
            }

            // update points in the ui
            document.getElementById("buildpoints").innerText = build.points;
        }

        // adding this here to update the info upon clicking also
        textbox.innerHTML = `${build.nodes[e.target.id].text}<div class="node-bottom">
                                                            <div id="node-cost">Cost: ${build.nodes[e.target.id].increment}</div>
                                                            <div id="node-selection">${build.nodes[e.target.id].selection}</div>
                                                            <div id="node-points">(${build.nodes[e.target.id].points}/${build.nodes[e.target.id].max})</div>
                                                        </div>`;
    }

    // checks surrounding nodes and colors connecting lines
    function colorLines(nodeId){

        let myLine;

        build.nodes[nodeId].links.forEach( link => {

            myLine = document.getElementById(lines.some(line => line.id === `${nodeId}-${link}`) ? `${nodeId}-${link}` : `${link}-${nodeId}`)

            if(build.nodes[nodeId].points != 0 && build.nodes[link].points != 0){

                myLine.setAttribute('stroke', "#ffee99cc");

            }else{

                myLine.setAttribute('stroke', "#444444cc");
            }
        });
    }

    // a depth first search to identify if a node is isolated and should be unselected
    function findRoot(myId, visited = new Set()) {

        // If the node has already been visited, skip it
        if (visited.has(myId)) {

            return false;

        }else{// Mark the current node as visited

            visited.add(myId);

        }

        for (let i = 0; i < build.nodes[myId].links.length; i++) {
            let link = build.nodes[myId].links[i];

            if (build.nodes[link].points == 0) {// Skip links to nodes with no points

                continue; 

            } else if (link.includes("00") || findRoot(link, visited)) {// Found a root node or a path to it

                return true; 
            }
        }

        dfsNodes.push(myId); // Record the node that is disconnected
        return false; // No path to a root node was found
    }

    // display node info in a text box that follows the cursor
    function showNodeInfo(e){

        const textbox = document.getElementById("nodeInfo");
        const node = build.nodes[e.target.id];

        textbox.innerHTML = `${node.text}${!node.id.includes("00") ? `<div class="node-bottom">
                                            <div id="node-cost">Cost: ${node.increment}</div>
                                            <div id="node-selection">${node.selection}</div>
                                            <div id="node-points">(${node.points}/${node.max})</div>
                                        </div>` : ""}`;

        const color = colors[node.color];
        textbox.style.backgroundImage = `linear-gradient(${color.substring(0,7)}, ${color.substring(0,7)}88)`;

        textbox.style.display = "block";
    }

    // hide the the node info box
    function hideNodeInfo(){

        document.getElementById("nodeInfo").style.display = "none";
    }

    // get the mouse coords and display
	function getMousePos(e){

		mousePos.x = e.clientX - rect.left;
		mousePos.y = e.clientY - rect.top;
		// document.getElementById("ui").innerHTML = "<pre>X:" + mousePos.x + "\tY:" + mousePos.y + "\t<pre>";

        // redraws the group of nodes
        if (isDragging) {
            transPos.x += e.clientX - dragPos.x;
            transPos.y += e.clientY - dragPos.y;
            dragPos.x = e.clientX;
            dragPos.y = e.clientY;
            updateTransform();
        }

        // plots the node info box radially around the svg group center
        positionNodeInfo();

	}

    // set the scale variable upon mouse wheel activity, refresh the transform attribute
    function zoomSvg(e){

        e.preventDefault();
        scale += (e.deltaY < 0) ? -0.1 : 0.1;
        scale = Math.max(0.1, Math.min(scale, 10));
        updateTransform();
    }

    // capture the starting point of the drag and flip the flag
    function startDrag(e){

        isDragging = true;
        dragPos.x = e.clientX;
        dragPos.y = e.clientY;
    }

    // turn off the drag flag
    function endDrag() {
        isDragging = false;
    }

    // change the transform attribute for the group of child elements within svg
    function updateTransform() {

        svgGroup.setAttribute("transform", `translate(${transPos.x}, ${transPos.y}) scale(${scale})`, mousePos);
    }

    function positionNodeInfo(){

        const nodeInfoBox = document.getElementById("nodeInfo");

        // Calculate delta
        const deltaX = mousePos.x - transPos.x;
        const deltaY = mousePos.y - transPos.y;
    
        // Normalize delta vector
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const directionX = deltaX / distance;
        const directionY = deltaY / distance;

        // Calculate the new position for the nodeInfo box
        const nodeInfoCenterX = mousePos.x + directionX * 250;
        const nodeInfoCenterY = mousePos.y + directionY * 250;

        // Get the size of the nodeInfo box
        const nodeInfoWidth = nodeInfoBox.offsetWidth;
        const nodeInfoHeight = nodeInfoBox.offsetHeight;

        // Set the position of the nodeInfo box
        nodeInfoBox.style.left = `${nodeInfoCenterX - nodeInfoWidth / 2}px`;
        nodeInfoBox.style.top = `${nodeInfoCenterY - nodeInfoHeight / 2}px`;

    }

}