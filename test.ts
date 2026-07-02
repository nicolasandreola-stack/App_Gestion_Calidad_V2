import { pushToSheets } from './api/sheets'; 
pushToSheets({
    users: { 
        testUser: { 
            rtM: [{id: 'c1', text: 'rutina test', days: 'all'}], 
            rtS: {'c1': {done: false, note: 'Esta es una nota importante'}}, 
            tks: [{id: 12345, text: 'tarea test', cat: 'SGI', comp: 'low', note: 'test note', prio: false, subtasks: [{id: '1', text: 'subtarea 1', completed: false}], l1:'', n1:'', l2:'', n2:'', l3:'', n3:'', del:''}], 
            h:[], cTks:[], dTks:[], ach:[], rtH:{} 
        } 
    }, 
    lastUpdate: ''
}).then(() => console.log('pushtosheets done'));
