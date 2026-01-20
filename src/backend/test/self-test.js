// Self-test script for Auto Test Ability
import http from 'http';

const BASE_URL = 'http://localhost:3000';

async function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const reqOptions = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);

        if (options.body) {
            req.write(JSON.stringify(options.body));
        }

        req.end();
    });
}

async function runTests() {
    console.log('🧪 Running Self-Tests...\n');
    const results = [];
    let token = null;

    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    try {
        const { status, data } = await makeRequest('/api/health');
        const passed = status === 200 && data.success;
        results.push({ name: 'Health Check', passed, details: data.status });
        console.log(passed ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (error) {
        results.push({ name: 'Health Check', passed: false, error: error.message });
        console.log('   ❌ FAILED:', error.message);
    }

    // Test 2: Self-Test Endpoint
    console.log('2. Testing Self-Test Endpoint...');
    try {
        const { status, data } = await makeRequest('/api/test');
        const passed = status === 200 && data.success;
        results.push({
            name: 'Self-Test Endpoint',
            passed,
            details: `${data.summary?.passed}/${data.summary?.total} tests passed`
        });
        console.log(passed ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (error) {
        results.push({ name: 'Self-Test Endpoint', passed: false, error: error.message });
        console.log('   ❌ FAILED:', error.message);
    }

    // Test 3: Login
    console.log('3. Testing Login...');
    try {
        const { status, data } = await makeRequest('/api/auth/login', {
            method: 'POST',
            body: { username: 'admin', password: 'admin123' }
        });
        const passed = status === 200 && data.success && data.token;
        token = data.token;
        results.push({ name: 'Login', passed });
        console.log(passed ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (error) {
        results.push({ name: 'Login', passed: false, error: error.message });
        console.log('   ❌ FAILED:', error.message);
    }

    // Test 4: Get Jobs (Authenticated)
    console.log('4. Testing Get Jobs...');
    try {
        const { status, data } = await makeRequest('/api/jobs', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const passed = status === 200 && data.success && Array.isArray(data.data);
        results.push({ name: 'Get Jobs', passed, details: `${data.data?.length} jobs found` });
        console.log(passed ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (error) {
        results.push({ name: 'Get Jobs', passed: false, error: error.message });
        console.log('   ❌ FAILED:', error.message);
    }

    // Test 5: Cron Parse
    console.log('5. Testing Cron Parse...');
    try {
        const { status, data } = await makeRequest('/api/cron/parse', {
            method: 'POST',
            body: { expression: '0 2 * * *' }
        });
        const passed = status === 200 && data.success && data.data.human;
        results.push({ name: 'Cron Parse', passed, details: data.data?.human });
        console.log(passed ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (error) {
        results.push({ name: 'Cron Parse', passed: false, error: error.message });
        console.log('   ❌ FAILED:', error.message);
    }

    // Test 6: Create Job
    console.log('6. Testing Create Job...');
    let createdJobId = null;
    try {
        const { status, data } = await makeRequest('/api/jobs', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
                name: 'Test Job',
                expression: '*/10 * * * *',
                command: 'echo "test"',
                description: 'Automated test job'
            }
        });
        const passed = status === 201 && data.success && data.data?.id;
        createdJobId = data.data?.id;
        results.push({ name: 'Create Job', passed });
        console.log(passed ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (error) {
        results.push({ name: 'Create Job', passed: false, error: error.message });
        console.log('   ❌ FAILED:', error.message);
    }

    // Test 7: Unauthorized Access
    console.log('7. Testing Unauthorized Access...');
    try {
        const { status } = await makeRequest('/api/jobs');
        const passed = status === 401;
        results.push({ name: 'Unauthorized Access', passed, details: 'Correctly rejected' });
        console.log(passed ? '   ✅ PASSED' : '   ❌ FAILED');
    } catch (error) {
        results.push({ name: 'Unauthorized Access', passed: false, error: error.message });
        console.log('   ❌ FAILED:', error.message);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${Math.round(passed / results.length * 100)}%`);

    if (failed > 0) {
        console.log('\n⚠️ Failed Tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}: ${r.error || 'Unknown error'}`);
        });
    }

    console.log('\n' + '='.repeat(50));

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
console.log('⏳ Waiting for server to be ready...\n');
setTimeout(runTests, 2000);
