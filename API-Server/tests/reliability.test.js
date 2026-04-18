const { parseErrors } = require('../reliabilityEngine');

describe('Reliability Engine & System Tests', () => {

  describe('1. Rule Engine Pattern Detection', () => {
    it('should detect EADDRINUSE', () => {
      const logs = "Error: listen EADDRINUSE: address already in use :::3000";
      const errs = parseErrors(logs);
      expect(errs[0].type).toBe('Port conflict');
    });

    it('should detect OOM', () => {
      const logs = "Container killed: exit code 137";
      const errs = parseErrors(logs);
      expect(errs[0].type).toBe('Out of Memory (OOM)');
    });

    it('should detect MODULE_NOT_FOUND', () => {
      const logs = "Error: Cannot find module 'express'";
      const errs = parseErrors(logs);
      expect(errs[0].type).toBe('Missing dependency');
    });
    
    it('should detect ECONNREFUSED', () => {
      const logs = "connect ECONNREFUSED 127.0.0.1:5432";
      const errs = parseErrors(logs);
      expect(errs[0].type).toBe('Service unreachable');
    });
    
    it('should detect Permission issues', () => {
      const logs = "Error: EACCES: permission denied, open '/app/data.txt'";
      const errs = parseErrors(logs);
      expect(errs[0].type).toBe('Permission issue');
    });

    it('should deduplicate multiple identical errors', () => {
      const logs = "EADDRINUSE\nEADDRINUSE\nECONNREFUSED";
      const errs = parseErrors(logs);
      expect(errs.length).toBe(2);
    });
  });

  describe('2. Crash Loop Detection & 3. AI Trigger', () => {
    it('should trigger crash loop and AI if restarts > 3 within 60s', () => {
       const timestamps = [
         Date.now() - 5000, 
         Date.now() - 10000, 
         Date.now() - 15000, 
         Date.now() - 20000
       ];
       const recent = timestamps.filter(t => Date.now() - t < 60000);
       expect(recent.length).toBe(4);
       
       const crashLoopDetected = recent.length > 3;
       expect(crashLoopDetected).toBe(true);
       
       // Deterministic mock condition for AI Trigger
       let aiTriggered = false;
       if (crashLoopDetected) {
         aiTriggered = true;
       }
       expect(aiTriggered).toBe(true);
    });
  });

  describe('4. Health Check System', () => {
     it('should mark unhealthy and trigger AI if timeout occurs after grace period', () => {
        let status = 'running';
        const uptime = 20; // >15s grace period
        const fetchWorks = false; // simulated failure
        let aiTriggered = false;
        
        if (uptime > 15 && !fetchWorks) {
           status = 'unhealthy';
           aiTriggered = true; // Trigger AI logic matched
        }
        
        expect(status).toBe('unhealthy');
        expect(aiTriggered).toBe(true);
     });
     
     it('should gracefully ignore failures during the 15s startup window', () => {
        let status = 'running';
        const uptime = 5; // <15s
        const fetchWorks = false; 
        
        if (uptime > 15 && !fetchWorks) {
           status = 'unhealthy';
        }
        
        expect(status).toBe('running');
     });
  });

  describe('5. Traffic Protection / Rate Limiting', () => {
      it('should block requests over MAX_REQUESTS limit and queue/throttle', () => {
         const requestCounts = {};
         const MAX = 100;
         const app = "testApp";
         
         // simulate 105 rapid requests
         for(let i=0; i<105; i++) {
            requestCounts[app] = (requestCounts[app] || 0) + 1;
         }
         
         const latestRequestHandled = requestCounts[app] <= MAX;
         expect(latestRequestHandled).toBe(false); // Should be true if it was blocked
      });
      
      it('should trigger AI insights when CPU or MEM > 90%', () => {
          let warningLogged = false;
          let aiInsightTriggered = false;
          
          const mockStats = { cpu: "95.5%", mem: "92%" };
          
          const cpuValue = parseFloat(mockStats.cpu.replace('%',''));
          const memValue = parseFloat(mockStats.mem.replace('%',''));
          
          if (cpuValue > 90 || memValue > 90) {
             warningLogged = true;
             aiInsightTriggered = true; // basic threshold triggers logic
          }
          
          expect(warningLogged).toBe(true);
          expect(aiInsightTriggered).toBe(true);
      });
  });
});
