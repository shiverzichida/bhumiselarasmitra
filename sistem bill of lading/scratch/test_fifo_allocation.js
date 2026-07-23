// FIFO transloading allocation algorithm test
function calculateFIFOAllocation(containers, allocations) {
    const links = [];
    
    // Create copy of container weights
    const contWeights = containers.map((c, i) => ({
        index: i,
        no: c.container_no,
        remaining: parseFloat(c.weight) || 0
    }));
    
    // Create copy of truck weights
    const truckWeights = allocations.map((a, i) => ({
        index: i,
        plate: a.plate_no,
        remaining: parseFloat(a.weight) || 0
    }));
    
    let contIdx = 0;
    let truckIdx = 0;
    
    while (contIdx < contWeights.length && truckIdx < truckWeights.length) {
        const c = contWeights[contIdx];
        const t = truckWeights[truckIdx];
        
        if (c.remaining <= 0) {
            contIdx++;
            continue;
        }
        if (t.remaining <= 0) {
            truckIdx++;
            continue;
        }
        
        const allocated = Math.min(c.remaining, t.remaining);
        
        links.push({
            containerIdx: c.index,
            containerNo: c.no,
            truckIdx: t.index,
            truckPlate: t.plate,
            weight: allocated
        });
        
        c.remaining -= allocated;
        t.remaining -= allocated;
    }
    
    return links;
}

// Test case from user request:
// 2 containers @ 25,000 kg
// 3 trucks: T1=10,000 kg, T2=11,000 kg, T3=9,000 kg, T4=10,000 kg, T5=10,000 kg
const containers = [
    { container_no: "SEGU1111111", weight: 25000 },
    { container_no: "SEGU2222222", weight: 25000 }
];

const allocations = [
    { plate_no: "T1", weight: 10000 },
    { plate_no: "T2", weight: 11000 },
    { plate_no: "T3", weight: 9000 },
    { plate_no: "T4", weight: 10000 },
    { plate_no: "T5", weight: 10000 }
];

console.log("Running FIFO transloading allocation test...");
const links = calculateFIFOAllocation(containers, allocations);
console.log("Generated Links:\n", JSON.stringify(links, null, 2));

// Total weight validation
const totalContWeight = containers.reduce((sum, c) => sum + c.weight, 0);
const totalAllocated = links.reduce((sum, l) => sum + l.weight, 0);
console.log(`Total Container Weight: ${totalContWeight} kg`);
console.log(`Total Allocated Weight: ${totalAllocated} kg`);

if (totalContWeight === totalAllocated) {
    console.log("SUCCESS: Weights are balanced!");
} else {
    console.error("FAIL: Weights are not balanced!");
}
