document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Check local storage or preferred color scheme
    const currentTheme = localStorage.getItem('theme') || 
                        (prefersDark.matches ? 'dark' : 'light');
    setTheme(currentTheme === 'dark');

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') !== 'dark';
        setTheme(isDark);
    });

    // Watch for system theme changes
    prefersDark.addListener(e => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches);
        }
    });

    // DOM elements
    const algorithmSelect = document.getElementById('algorithm');
    const quantumContainer = document.getElementById('quantum-container');
    const quantumInput = document.getElementById('quantum');
    const processIdInput = document.getElementById('process-id');
    const arrivalTimeInput = document.getElementById('arrival-time');
    const burstTimeInput = document.getElementById('burst-time');
    const priorityInput = document.getElementById('priority');
    const addProcessBtn = document.getElementById('add-process');
    const clearProcessesBtn = document.getElementById('clear-processes');
    const simulateBtn = document.getElementById('simulate');
    const processesTable = document.getElementById('processes').getElementsByTagName('tbody')[0];
    const ganttChart = document.getElementById('gantt-chart');
    const resultsTable = document.getElementById('results').getElementsByTagName('tbody')[0];
    const summaryStats = document.getElementById('summary-stats');
    
    // Process data
    let processes = [];
    
    // Event listeners
    algorithmSelect.addEventListener('change', function() {
        quantumContainer.style.display = this.value === 'rr' ? 'block' : 'none';
    });
    
    addProcessBtn.addEventListener('click', addProcess);
    clearProcessesBtn.addEventListener('click', clearProcesses);
    simulateBtn.addEventListener('click', runSimulation);
    
    // Add process from form
    function addProcess() {
        const processId = processIdInput.value.trim();
        const arrivalTime = parseInt(arrivalTimeInput.value);
        const burstTime = parseInt(burstTimeInput.value);
        const priority = parseInt(priorityInput.value) || 1;
        
        if (!processId || isNaN(arrivalTime) || isNaN(burstTime)) {
            alert('Please fill all required fields with valid values');
            return;
        }
        
        const process = {
            id: processId,
            arrivalTime: arrivalTime,
            burstTime: burstTime,
            remainingTime: burstTime,
            priority: priority,
            startTime: null,
            finishTime: null,
            waitingTime: 0,
            responseTime: null
        };
        
        processes.push(process);
        updateProcessesTable();
        
        // Clear input fields
        processIdInput.value = '';
        arrivalTimeInput.value = '0';
        burstTimeInput.value = '';
        priorityInput.value = '1';
        processIdInput.focus();
    }
    
    // Update processes table
    function updateProcessesTable() {
        processesTable.innerHTML = '';
        
        processes.forEach((process, index) => {
            const row = processesTable.insertRow();
            
            row.insertCell(0).textContent = process.id;
            row.insertCell(1).textContent = process.arrivalTime;
            row.insertCell(2).textContent = process.burstTime;
            row.insertCell(3).textContent = process.priority;
            
            const deleteCell = row.insertCell(4);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.style.padding = '0.5rem';
            deleteBtn.addEventListener('click', () => {
                processes.splice(index, 1);
                updateProcessesTable();
            });
            deleteCell.appendChild(deleteBtn);
        });
    }
    
    // Clear all processes
    function clearProcesses() {
        processes = [];
        updateProcessesTable();
        clearResults();
    }
    
    // Clear results
    function clearResults() {
        ganttChart.innerHTML = '';
        resultsTable.innerHTML = '';
        summaryStats.innerHTML = '';
    }
    
    // Run simulation
    function runSimulation() {
        if (processes.length === 0) {
            alert('Please add at least one process');
            return;
        }
        
        clearResults();
        
        const algorithm = algorithmSelect.value;
        const quantum = algorithm === 'rr' ? parseInt(quantumInput.value) : null;
        
        // Make a deep copy of processes for simulation
        const simProcesses = JSON.parse(JSON.stringify(processes));
        
        let results;
        
        switch (algorithm) {
            case 'fcfs':
                results = fcfs(simProcesses);
                break;
            case 'sjf':
                results = sjf(simProcesses);
                break;
            case 'srtf':
                results = srtf(simProcesses);
                break;
            case 'rr':
                results = roundRobin(simProcesses, quantum);
                break;
            case 'priority':
                results = priorityScheduling(simProcesses, false);
                break;
            case 'priority_preemptive':
                results = priorityScheduling(simProcesses, true);
                break;
            default:
                results = fcfs(simProcesses);
        }
        
        displayResults(results);
    }
    
    // Scheduling algorithms
    function fcfs(processes) {
        // Sort by arrival time
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        const gantt = [];
        
        for (const process of processes) {
            // If process arrives after current time, CPU is idle
            if (process.arrivalTime > currentTime) {
                gantt.push({
                    process: {id: 'IDLE'},
                    start: currentTime,
                    end: process.arrivalTime
                });
                currentTime = process.arrivalTime;
            }
            
            process.startTime = currentTime;
            process.responseTime = currentTime - process.arrivalTime;
            currentTime += process.burstTime;
            process.finishTime = currentTime;
            process.turnaroundTime = process.finishTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            
            gantt.push({
                process: process,
                start: process.startTime,
                end: process.finishTime
            });
        }
        
        return {
            processes: processes,
            gantt: gantt
        };
    }
    
    function sjf(processes) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        const gantt = [];
        const queue = [];
        let i = 0;
        
        while (i < processes.length || queue.length > 0) {
            // Add arrived processes to queue
            while (i < processes.length && processes[i].arrivalTime <= currentTime) {
                queue.push(processes[i]);
                i++;
            }
            
            if (queue.length === 0) {
                // CPU idle
                const nextArrival = processes[i].arrivalTime;
                gantt.push({
                    process: {id: 'IDLE'},
                    start: currentTime,
                    end: nextArrival
                });
                currentTime = nextArrival;
                continue;
            }
            
            // Sort queue by burst time (SJF)
            queue.sort((a, b) => a.burstTime - b.burstTime);
            
            const process = queue.shift();
            
            process.startTime = currentTime;
            process.responseTime = currentTime - process.arrivalTime;
            currentTime += process.burstTime;
            process.finishTime = currentTime;
            process.turnaroundTime = process.finishTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            
            gantt.push({
                process: process,
                start: process.startTime,
                end: process.finishTime
            });
        }
        
        return {
            processes: processes,
            gantt: gantt
        };
    }
    
    function srtf(processes) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        const gantt = [];
        const queue = [];
        let i = 0;
        let currentProcess = null;
        let lastSwitchTime = 0;
        
        while (i < processes.length || queue.length > 0 || currentProcess !== null) {
            // Add arrived processes to queue
            while (i < processes.length && processes[i].arrivalTime <= currentTime) {
                queue.push(processes[i]);
                i++;
            }
            
            // Sort queue by remaining time (SRTF)
            queue.sort((a, b) => a.remainingTime - b.remainingTime);
            
            // Check if we should switch processes
            if (currentProcess !== null && queue.length > 0 && 
                queue[0].remainingTime < currentProcess.remainingTime) {
                // Preempt current process
                queue.push(currentProcess);
                currentProcess = null;
            }
            
            if (currentProcess === null && queue.length > 0) {
                // Start a new process
                currentProcess = queue.shift();
                
                if (currentProcess.startTime === null) {
                    currentProcess.startTime = currentTime;
                    currentProcess.responseTime = currentTime - currentProcess.arrivalTime;
                }
                
                // Record the switch in Gantt chart
                if (lastSwitchTime < currentTime) {
                    if (gantt.length > 0 && gantt[gantt.length - 1].process.id === 'IDLE') {
                        // Extend idle time
                        gantt[gantt.length - 1].end = currentTime;
                    } else {
                        gantt.push({
                            process: {id: 'IDLE'},
                            start: lastSwitchTime,
                            end: currentTime
                        });
                    }
                }
                
                lastSwitchTime = currentTime;
            }
            
            if (currentProcess === null) {
                // CPU idle
                if (i < processes.length) {
                    const nextArrival = processes[i].arrivalTime;
                    gantt.push({
                        process: {id: 'IDLE'},
                        start: currentTime,
                        end: nextArrival
                    });
                    currentTime = nextArrival;
                } else {
                    // No more processes
                    break;
                }
            } else {
                // Execute current process for 1 time unit
                currentTime++;
                currentProcess.remainingTime--;
                
                if (currentProcess.remainingTime === 0) {
                    // Process finished
                    currentProcess.finishTime = currentTime;
                    currentProcess.turnaroundTime = currentProcess.finishTime - currentProcess.arrivalTime;
                    currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                    
                    gantt.push({
                        process: currentProcess,
                        start: lastSwitchTime,
                        end: currentTime
                    });
                    
                    lastSwitchTime = currentTime;
                    currentProcess = null;
                }
            }
        }
        
        return {
            processes: processes,
            gantt: gantt
        };
    }
    
    function roundRobin(processes, quantum) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        const gantt = [];
        const queue = [];
        let i = 0;
        
        while (i < processes.length || queue.length > 0) {
            // Add arrived processes to queue
            while (i < processes.length && processes[i].arrivalTime <= currentTime) {
                queue.push(processes[i]);
                i++;
            }
            
            if (queue.length === 0) {
                // CPU idle
                if (i < processes.length) {
                    const nextArrival = processes[i].arrivalTime;
                    gantt.push({
                        process: {id: 'IDLE'},
                        start: currentTime,
                        end: nextArrival
                    });
                    currentTime = nextArrival;
                } else {
                    break;
                }
            } else {
                const process = queue.shift();
                
                if (process.startTime === null) {
                    process.startTime = currentTime;
                    process.responseTime = currentTime - process.arrivalTime;
                }
                
                const executionTime = Math.min(quantum, process.remainingTime);
                
                gantt.push({
                    process: process,
                    start: currentTime,
                    end: currentTime + executionTime
                });
                
                currentTime += executionTime;
                process.remainingTime -= executionTime;
                
                // Add arrived processes during this quantum
                while (i < processes.length && processes[i].arrivalTime <= currentTime) {
                    queue.push(processes[i]);
                    i++;
                }
                
                if (process.remainingTime > 0) {
                    queue.push(process);
                } else {
                    process.finishTime = currentTime;
                    process.turnaroundTime = process.finishTime - process.arrivalTime;
                    process.waitingTime = process.turnaroundTime - process.burstTime;
                }
            }
        }
        
        return {
            processes: processes,
            gantt: gantt
        };
    }
    
    function priorityScheduling(processes, preemptive) {
        processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        let currentTime = 0;
        const gantt = [];
        const queue = [];
        let i = 0;
        let currentProcess = null;
        let lastSwitchTime = 0;
        
        while (i < processes.length || queue.length > 0 || currentProcess !== null) {
            // Add arrived processes to queue
            while (i < processes.length && processes[i].arrivalTime <= currentTime) {
                queue.push(processes[i]);
                i++;
            }
            
            // Sort queue by priority (lower number = higher priority)
            queue.sort((a, b) => a.priority - b.priority);
            
            if (preemptive && currentProcess !== null && queue.length > 0 && 
                queue[0].priority < currentProcess.priority) {
                // Preempt current process
                queue.push(currentProcess);
                currentProcess = null;
            }
            
            if (currentProcess === null && queue.length > 0) {
                // Start a new process
                currentProcess = queue.shift();
                
                if (currentProcess.startTime === null) {
                    currentProcess.startTime = currentTime;
                    currentProcess.responseTime = currentTime - currentProcess.arrivalTime;
                }
                
                // Record the switch in Gantt chart
                if (lastSwitchTime < currentTime) {
                    if (gantt.length > 0 && gantt[gantt.length - 1].process.id === 'IDLE') {
                        // Extend idle time
                        gantt[gantt.length - 1].end = currentTime;
                    } else {
                        gantt.push({
                            process: {id: 'IDLE'},
                            start: lastSwitchTime,
                            end: currentTime
                        });
                    }
                }
                
                lastSwitchTime = currentTime;
            }
            
            if (currentProcess === null) {
                // CPU idle
                if (i < processes.length) {
                    const nextArrival = processes[i].arrivalTime;
                    gantt.push({
                        process: {id: 'IDLE'},
                        start: currentTime,
                        end: nextArrival
                    });
                    currentTime = nextArrival;
                } else {
                    // No more processes
                    break;
                }
            } else {
                // Execute current process
                if (preemptive) {
                    // Execute for 1 time unit in preemptive mode
                    currentTime++;
                    currentProcess.remainingTime--;
                    
                    if (currentProcess.remainingTime === 0) {
                        // Process finished
                        currentProcess.finishTime = currentTime;
                        currentProcess.turnaroundTime = currentProcess.finishTime - currentProcess.arrivalTime;
                        currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                        
                        gantt.push({
                            process: currentProcess,
                            start: lastSwitchTime,
                            end: currentTime
                        });
                        
                        lastSwitchTime = currentTime;
                        currentProcess = null;
                    }
                } else {
                    // Non-preemptive - execute entire burst
                    currentTime += currentProcess.remainingTime;
                    currentProcess.remainingTime = 0;
                    currentProcess.finishTime = currentTime;
                    currentProcess.turnaroundTime = currentProcess.finishTime - currentProcess.arrivalTime;
                    currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                    
                    gantt.push({
                        process: currentProcess,
                        start: lastSwitchTime,
                        end: currentTime
                    });
                    
                    lastSwitchTime = currentTime;
                    currentProcess = null;
                }
            }
        }
        
        return {
            processes: processes,
            gantt: gantt
        };
    }
    
    // Display results
    function displayResults(results) {
        displayGanttChart(results.gantt);
        displayProcessMetrics(results.processes);
        displaySummaryStats(results.processes);
    }
    
    function displayGanttChart(gantt) {
        ganttChart.innerHTML = '';
        
        if (gantt.length === 0) return;
        
        // Create timeline markers
        const timeline = document.createElement('div');
        timeline.className = 'gantt-timeline';
        
        const maxTime = gantt[gantt.length - 1].end;
        const step = Math.ceil(maxTime / 10);
        
        for (let i = 0; i <= maxTime; i += step) {
            const marker = document.createElement('div');
            marker.className = 'gantt-timeline-marker';
            marker.style.left = `${(i / maxTime) * 100}%`;
            marker.textContent = i;
            timeline.appendChild(marker);
        }
        
        ganttChart.appendChild(timeline);
        
        // Create blocks
        gantt.forEach(entry => {
            const duration = entry.end - entry.start;
            if (duration <= 0) return;
            
            const block = document.createElement('div');
            block.className = `gantt-block ${entry.process.id === 'IDLE' ? 'idle' : ''}`;
            block.style.backgroundColor = entry.process.id === 'IDLE' ? '#95a5a6' : getRandomColor(entry.process.id);
            block.style.width = `${duration * 30}px`;
            
            const processId = document.createElement('div');
            processId.textContent = entry.process.id;
            block.appendChild(processId);
            
            const durationLabel = document.createElement('div');
            durationLabel.className = 'gantt-duration';
            durationLabel.textContent = duration;
            block.appendChild(durationLabel);
            
            const timeLabel = document.createElement('div');
            timeLabel.className = 'gantt-time';
            timeLabel.textContent = entry.start;
            block.appendChild(timeLabel);
            
            ganttChart.appendChild(block);
        });
        
        // Add final time
        const finalTime = document.createElement('div');
        finalTime.className = 'gantt-time';
        finalTime.textContent = gantt[gantt.length - 1].end;
        finalTime.style.position = 'absolute';
        finalTime.style.right = '0';
        finalTime.style.bottom = '-25px';
        ganttChart.appendChild(finalTime);
    }
    
    function displayProcessMetrics(processes) {
        resultsTable.innerHTML = '';
        
        processes.forEach(process => {
            const row = resultsTable.insertRow();
            
            row.insertCell(0).textContent = process.id;
            row.insertCell(1).textContent = process.arrivalTime;
            row.insertCell(2).textContent = process.burstTime;
            row.insertCell(3).textContent = process.finishTime;
            row.insertCell(4).textContent = process.turnaroundTime;
            row.insertCell(5).textContent = process.waitingTime;
            row.insertCell(6).textContent = process.responseTime;
        });
    }
    
    function displaySummaryStats(processes) {
        const totalTurnaround = processes.reduce((sum, p) => sum + p.turnaroundTime, 0);
        const totalWaiting = processes.reduce((sum, p) => sum + p.waitingTime, 0);
        const totalResponse = processes.reduce((sum, p) => sum + p.responseTime, 0);
        
        const avgTurnaround = totalTurnaround / processes.length;
        const avgWaiting = totalWaiting / processes.length;
        const avgResponse = totalResponse / processes.length;
        
        const throughput = processes.length / processes[processes.length - 1].finishTime;
        
        summaryStats.innerHTML = `
            <div class="stat-item">
                <h4>Average Turnaround Time</h4>
                <div class="stat-value">${avgTurnaround.toFixed(2)}</div>
            </div>
            <div class="stat-item">
                <h4>Average Waiting Time</h4>
                <div class="stat-value">${avgWaiting.toFixed(2)}</div>
            </div>
            <div class="stat-item">
                <h4>Average Response Time</h4>
                <div class="stat-value">${avgResponse.toFixed(2)}</div>
            </div>
            <div class="stat-item">
                <h4>Throughput</h4>
                <div class="stat-value">${throughput.toFixed(4)} processes/unit time</div>
            </div>
        `;
    }
    
    // Helper function to generate consistent colors for processes
    function getRandomColor(seed) {
        const colors = [
            '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
            '#1abc9c', '#d35400', '#34495e', '#16a085', '#c0392b',
            '#8e44ad', '#27ae60', '#f1c40f', '#e67e22', '#7f8c8d'
        ];
        
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
});
