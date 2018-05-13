const MAX_CREEPS = 16;
const ROOM_SIZE = 50;
const COLORS = ['#aaa', '#bbb', '#ccc'];

let map;

function bodyCost(body) {
  return body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
}

module.exports.loop = () => {
  const spawn = Game.spawns.Spawn1;
  const room = spawn.room;

  map = new Uint8Array(ROOM_SIZE * ROOM_SIZE);

  const objects = room.lookAtArea(0, 0, ROOM_SIZE, ROOM_SIZE, true);
  objects.forEach(obj => {
    const { x, y, type } = obj;
    if (type === 'terrain') {
      const { terrain } = obj;
      if (terrain === 'swamp') {
        map[x * ROOM_SIZE + y] = 1;
      } else if (terrain === 'wall') {
        map[x * ROOM_SIZE + y] = 2;
      }
    } else {
      console.log(obj.type);
    }
  });

  map.forEach((val, i) => {
    const x = Math.floor(i / ROOM_SIZE);
    const y = i % ROOM_SIZE;
    if (val === 1) {
      room.visual.circle(x, y, { fill: '#00ff00' });
    }
    if (val === 2) {
      room.visual.circle(x, y, { fill: '#aaa' });
    }
  });

  let creepAmount = Object.keys(Game.creeps).length;

  for (const i in Memory.creeps) {
    if (!Game.creeps[i]) {
      delete Memory.creeps[i];
    }
  }
  const body = [WORK];
  while (bodyCost(body) + bodyCost([MOVE, CARRY]) <= spawn.energyCapacity) {
    body.push(MOVE);
    body.push(CARRY);
  }
  if (creepAmount < MAX_CREEPS && spawn.energy === spawn.energyCapacity) {
    let id = 1;
    while (true) {
      const actionState = spawn.spawnCreep(body, `Harvester${id}`, {
        role: 'harvester',
      });
      if (actionState === OK) {
        break;
      }
      id++;
    }
    creepAmount += 1;
  }

  for (const creepName in Game.creeps) {
    if (!Game.creeps.hasOwnProperty(creepName)) continue; // eslint-disable-line no-continue
    const creep = Game.creeps[creepName];

    if (!creep.memory.state) {
      creep.memory.state = 'harvesting';
    }

    if (creep.memory.state === 'refilling') {
      creep.say('🔅');
      if (creep.carry.energy === 0) {
        creep.memory.state = 'harvesting';
      } else {
        const targets = creep.room.find(FIND_STRUCTURES, {
          filter: structure =>
            (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_TOWER) &&
            structure.energy < structure.energyCapacity,
        });
        if (targets.length > 0) {
          if (
            creep.transfer(targets[0], RESOURCE_ENERGY) === ERR_NOT_IN_RANGE
          ) {
            creep.moveTo(targets[0], {
              visualizePathStyle: { stroke: '#ffffff' },
            });
          }
        } else {
          creep.memory.state = 'upgrading';
        }
      }
    }

    if (creep.memory.state === 'upgrading') {
      creep.say('🔼');
      if (creep.carry.energy === 0) {
        creep.memory.state = 'harvesting';
      } else {
        const actionState = creep.upgradeController(creep.room.controller);
        if (actionState === ERR_NOT_IN_RANGE) {
          creep.moveTo(creep.room.controller, {
            visualizePathStyle: { stroke: '#ffffff' },
          });
        }
      }
    }
    if (creep.memory.state === 'harvesting') {
      creep.say('🚜');
      if (creep.carry.energy === creep.carryCapacity) {
        delete creep.memory.harvestingTarget;
        creep.memory.state = 'refilling';
      } else {
        let target;
        if (creep.memory.harvestingTarget) {
          target = Game.getObjectById(creep.memory.harvestingTarget);
        } else {
          const sources = creep.room.find(FIND_SOURCES);
          target = sources[Math.floor(Math.random() * sources.length)];
          creep.memory.harvestingTarget = target.id;
        }

        const actionState = creep.harvest(target);
        if (actionState === ERR_NOT_IN_RANGE) {
          creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
      }
    }
  }
};
