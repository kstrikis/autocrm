/*
  UPDATED SEED FILE

  • Tickets that are referenced by tests where Carol only adds notes/status/tags will be pre‐assigned to Carol (service1).
  • Tickets that require Carol to self‐assign (i.e. an assignment action in the test) are left unassigned.
  • Also, “Hydraulic drill rig pressure loss” is split into two tickets:
       – “Hydraulic drill rig pressure loss - assigned”  (for Test 21; assigned to Carol)
       – “Hydraulic drill rig pressure loss - unassigned” (for Test 25; left unassigned)

  The assignment field (assigned_to) is not stored as an email address but later is overridden 
  with the service rep’s UUID after creation.
*/

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables');
}

// 10 customers with distinct writing styles and equipment types
const testCustomers = [
  // Original demo users from seed-users.ts
  {
    email: 'customer1@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Alice Customer',
      display_name: 'Alice C.',
      role: 'customer',
      company: 'Demo Corp'
    }
  },
  {
    email: 'customer2@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Bob Customer',
      display_name: 'Bob C.',
      role: 'customer',
      company: 'Demo LLC'
    }
  },
  // Our new test customers
  {
    email: 'john.warehouse@example.com',
    password: 'Password123!',
    data: {
      full_name: 'John Warehouse',
      display_name: 'John W.',
      role: 'customer',
      company: 'Warehouse Solutions Inc.'
    }
  },
  {
    email: 'sarah.construction@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Sarah Builder',
      display_name: 'Sarah B.',
      role: 'customer',
      company: 'BuildRight Construction'
    }
  },
  {
    email: 'mike.logistics@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Mike Shipper',
      display_name: 'Mike S.',
      role: 'customer',
      company: 'FastTrack Logistics'
    }
  },
  {
    email: 'lisa.manufacturing@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Lisa Plant',
      display_name: 'Lisa P.',
      role: 'customer',
      company: 'Precision Manufacturing Co.'
    }
  },
  {
    email: 'dave.mining@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Dave Miner',
      display_name: 'Dave M.',
      role: 'customer',
      company: 'DeepRock Mining'
    }
  },
  {
    email: 'karen.retail@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Karen Store',
      display_name: 'Karen S.',
      role: 'customer',
      company: 'MegaMart Distribution'
    }
  },
  {
    email: 'tom.agriculture@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Tom Farmer',
      display_name: 'Tom F.',
      role: 'customer',
      company: 'Harvest Equipment Ltd.'
    }
  },
  {
    email: 'rachel.recycling@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Rachel Green',
      display_name: 'Rachel G.',
      role: 'customer',
      company: 'EcoSort Recycling'
    }
  },
  {
    email: 'paul.port@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Paul Docker',
      display_name: 'Paul D.',
      role: 'customer',
      company: 'Harbor Operations Inc.'
    }
  },
  {
    email: 'amy.food@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Amy Process',
      display_name: 'Amy P.',
      role: 'customer',
      company: 'FoodTech Processing'
    }
  }
];

// Service reps with different specialties
const testServiceReps = [
  {
    email: 'service1@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Carol Service',
      display_name: 'Carol S.',
      role: 'service_rep',
      company: 'AutoCRM'
    }
  },
  {
    email: 'service2@example.com',
    password: 'Password123!',
    data: {
      full_name: 'David Service',
      display_name: 'David S.',
      role: 'service_rep',
      company: 'AutoCRM'
    }
  },
  {
    email: 'frank.tech@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Frank Tech',
      display_name: 'Frank T.',
      role: 'service_rep',
      company: 'AutoCRM'
    }
  },
  {
    email: 'helen.support@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Helen Helper',
      display_name: 'Helen H.',
      role: 'service_rep',
      company: 'AutoCRM'
    }
  }
];

// Add admin user
const testAdmins = [
  {
    email: 'admin@example.com',
    password: 'Password123!',
    data: {
      full_name: 'Eva Admin',
      display_name: 'Eva A.',
      role: 'admin',
      company: 'AutoCRM'
    }
  }
];

/*
  Updated Tickets

  For any test where Carol’s input does not include self-assignment, the intended ticket
  must already be assigned to her. For tickets that are expected to be self-assigned, 
  assigned_to is set to null.

  The following allocation is used (by title):

  Pre-assigned to Carol (service1):
    • "Toyota 8FGU25 forklift hydraulic leak"                (Test 1)
    • "CAT excavator won't start"                             (Test 2)
    • "Dock leveler malfunction - Bay 3"                      (Test 4)
    • "Electric pallet jack battery issues"                   (Test 5)
    • "Bobcat skid steer tracks loose"                        (Test 6)
    • "Low tire pressure on the reach stacker"                (Test 9)
    • "John Deere combine harvester engine overheating"       (Test 10)
    • "Metal detector calibration drift"                      (Test 11)
    • "Shredder overload protection trips"                    (Test 13)
    • "Magnetic separator belt misalignment"                  (Test 14)
    • "Conveyor belt misalignment"                             (Test 15)
    • "Irrigation pump pressure fluctuation"                  (Test 16)
    • "Packaging line servo motor fault"                      (Test 18)
    • "Robot arm calibration drift"                           (Test 20)
    • "Hydraulic drill rig pressure loss - assigned"          (Test 21)
    • "Preventive maintenance check"                          (Test 22)
    • "Loading dock door sensor replacement"                  (Not referenced in tests, but assign to Carol)
    • "Upgrade request for control system"                    (Test 23)
    • "New equipment installation quote"                      (Test 24)

  Self-assignment (initially unassigned):
    • "CNC machine spindle alignment error"                  (Test 3)
    • "Container spreader thing not locking properly"         (Test 7)
    • "STS Crane #3 keeps losing power"                       (Test 8)
    • "Pallet wrapper tension issues"                         (Test 12)
    • "Grain auger bearing noise"                             (Test 17)
    • "Automated storage retrieval system failure"            (Test 19)
    • "Hydraulic drill rig pressure loss - unassigned"        (Test 25)
*/

const testTickets = [
  // John's tickets (Warehouse)
  {
    customerId: 'john.warehouse@example.com',
    title: 'Toyota 8FGU25 forklift hydraulic leak',
    description: 'Our main warehouse forklift (Toyota 8FGU25, Serial #8FGU25-12345) is experiencing a significant hydraulic leak from the mast assembly. Fluid loss is approximately 200ml per shift. Need urgent repair as this is our primary loading equipment.',
    priority: 'high',
    status: 'new',
    tags: ['forklift', 'hydraulic', 'leak', 'toyota'],
    // Pre-assigned to Carol
    assigned_to: 'service1'  // placeholder; will be replaced with Carol’s UUID from serviceRepIds
  },
  {
    customerId: 'john.warehouse@example.com',
    title: 'Scheduled maintenance for Raymond Reach truck',
    description: 'Routine maintenance for our Raymond Reach truck (Model 7500).',
    priority: 'medium',
    status: 'new',
    tags: ['reach-truck', 'maintenance', 'raymond'],
    // Default not referenced – assign to Carol
    assigned_to: 'service1'
  },

  // Sarah's tickets (Construction)
  {
    customerId: 'sarah.construction@example.com',
    title: 'CAT excavator won\'t start',
    description: 'CAT 320 won\'t start. Batteries seem ok. Need ASAP - holding up site work!!',
    priority: 'urgent',
    status: 'new',
    tags: ['excavator', 'caterpillar', 'electrical'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'sarah.construction@example.com',
    title: 'Bobcat skid steer tracks loose',
    description: 'Tracks getting loose on Bobcat S650. Making clacking noise.',
    priority: 'high',
    status: 'new',
    tags: ['bobcat', 'tracks', 'noise'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },

  // Mike's tickets (Logistics)
  {
    customerId: 'mike.logistics@example.com',
    title: 'Dock leveler malfunction - Bay 3',
    description: 'Dock leveler in Bay 3 (Blue Giant model XDS) not maintaining level position.',
    priority: 'high',
    status: 'new',
    tags: ['dock-leveler', 'hydraulic', 'blue-giant'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'mike.logistics@example.com',
    title: 'Electric pallet jack battery issues',
    description: 'Crown PE4500 electric pallet jack showing reduced runtime after charging.',
    priority: 'medium',
    status: 'open',
    tags: ['pallet-jack', 'battery', 'crown'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },

  // Lisa's tickets (Manufacturing)
  {
    customerId: 'lisa.manufacturing@example.com',
    title: 'CNC machine spindle alignment error',
    description: 'Haas VF-2SS spindle alignment error (Code: AL-278).',
    priority: 'urgent',
    status: 'new',
    tags: ['cnc', 'haas', 'spindle', 'precision'],
    // Self-assignment test: leave unassigned
    assigned_to: null
  },
  {
    customerId: 'lisa.manufacturing@example.com',
    title: 'Robot arm calibration drift',
    description: 'FANUC R-2000iC robot arm experiencing calibration drift.',
    priority: 'high',
    status: 'open',
    tags: ['robot', 'fanuc', 'calibration'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },

  // Dave's tickets (Mining)
  {
    customerId: 'dave.mining@example.com',
    title: 'Conveyor belt misalignment',
    description: 'Main crusher feed conveyor belt misaligned. Safety sensors triggered.',
    priority: 'urgent',
    status: 'new',
    tags: ['conveyor', 'safety', 'belt'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  // TWO drill rig tickets:
  {
    customerId: 'dave.mining@example.com',
    title: 'Hydraulic drill rig pressure loss - assigned',
    description: 'Atlas Copco D65 drill rig losing pressure (200->150 bar).',
    priority: 'high',
    status: 'open',
    tags: ['drill-rig', 'hydraulic', 'atlas-copco'],
    // Pre-assigned to Carol for Test 21
    assigned_to: 'service1'
  },
  {
    customerId: 'dave.mining@example.com',
    title: 'Hydraulic drill rig pressure loss - unassigned',
    description: 'Atlas Copco D65 drill rig losing pressure (200->150 bar) – review needed.',
    priority: 'high',
    status: 'open',
    tags: ['drill-rig', 'hydraulic', 'atlas-copco'],
    // Self-assignment test so leave unassigned (null)
    assigned_to: null
  },

  // Karen's tickets (Retail)
  {
    customerId: 'karen.retail@example.com',
    title: 'Automated storage retrieval system failure',
    description: 'ASRS in Zone B completely offline. Error code E-235.',
    priority: 'urgent',
    status: 'new',
    tags: ['asrs', 'automation', 'warehouse'],
    // Self-assignment so unassigned
    assigned_to: null
  },
  {
    customerId: 'karen.retail@example.com',
    title: 'Conveyor belt speed sensor malfunction',
    description: 'Conveyor speed sensor error, causing jams at sorting stations.',
    priority: 'high',
    status: 'new',
    tags: ['conveyor', 'sensor', 'sorting'],
    // Not directly referenced – assign to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'karen.retail@example.com',
    title: 'Pallet wrapper tension issues',
    description: 'Pallet wrapper applying inconsistent tension; film breaking frequently.',
    priority: 'medium',
    status: 'new',
    tags: ['pallet-wrapper', 'maintenance'],
    // Self-assignment so unassigned
    assigned_to: null
  },

  // Tom's tickets (Agriculture)
  {
    customerId: 'tom.agriculture@example.com',
    title: 'John Deere combine harvester engine overheating',
    description: 'S780 combine overheating. Radiator clean, coolant full.',
    priority: 'urgent',
    status: 'new',
    tags: ['combine', 'john-deere', 'engine', 'cooling'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'tom.agriculture@example.com',
    title: 'Irrigation pump pressure fluctuation',
    description: 'Center pivot irrigation system showing pressure drops. Grundfos pump cycling irregularly.',
    priority: 'high',
    status: 'new',
    tags: ['irrigation', 'pump', 'grundfos'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'tom.agriculture@example.com',
    title: 'Grain auger bearing noise',
    description: 'Westfield grain auger making loud grinding noise at main drive bearing.',
    priority: 'medium',
    status: 'new',
    tags: ['auger', 'bearing', 'westfield'],
    // Self-assignment so unassigned
    assigned_to: null
  },

  // Rachel's tickets (Recycling)
  {
    customerId: 'rachel.recycling@example.com',
    title: 'Baler hydraulic system contamination',
    description: 'Marathon V6030 baler reporting high particle count in hydraulic system.',
    priority: 'high',
    status: 'new',
    tags: ['baler', 'hydraulic', 'marathon', 'contamination'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'rachel.recycling@example.com',
    title: 'Shredder overload protection trips',
    description: 'Industrial shredder (UNTHA RS40) triggering overload protection repeatedly.',
    priority: 'high',
    status: 'new',
    tags: ['shredder', 'electrical', 'untha'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'rachel.recycling@example.com',
    title: 'Magnetic separator belt misalignment',
    description: 'Eriez suspended magnet showing belt tracking issues; belt moving 15mm to left.',
    priority: 'medium',
    status: 'new',
    tags: ['separator', 'belt', 'eriez'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },

  // Paul's tickets (Port Operations)
  {
    customerId: 'paul.port@example.com',
    title: 'Container spreader thing not locking properly',
    description: 'Kalmar container handler twistlock not clicking in correctly.',
    priority: 'urgent',
    status: 'new',
    tags: ['container-handler', 'kalmar', 'spreader', 'safety'],
    // Self-assignment so unassigned
    assigned_to: null
  },
  {
    customerId: 'paul.port@example.com',
    title: 'STS Crane #3 keeps losing power',
    description: 'ZPMC crane losing power when swinging trolley. F-387 code flashes.',
    priority: 'high',
    status: 'new',
    tags: ['gantry-crane', 'electrical', 'zpmc'],
    // Self-assignment so unassigned
    assigned_to: null
  },
  {
    customerId: 'paul.port@example.com',
    title: 'Low tire pressure on the reach stacker',
    description: 'Hyster reach stacker tire pressure low; reading 85-90 PSI instead of 125.',
    priority: 'medium',
    status: 'new',
    tags: ['reach-stacker', 'hyster', 'tires'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },

  // Amy's tickets (Food Processing)
  {
    customerId: 'amy.food@example.com',
    title: 'Steam kettle temperature control failure',
    description: 'Groen BPM-40G steam kettle not holding set temperature. Affected production line 2.',
    priority: 'urgent',
    status: 'new',
    tags: ['kettle', 'temperature', 'groen', 'food-safety'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'amy.food@example.com',
    title: 'Packaging line servo motor fault',
    description: 'Multivac R535 packaging line servo motor throwing Error 22-8B; seal integrity compromised.',
    priority: 'high',
    status: 'new',
    tags: ['packaging', 'servo', 'multivac'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'amy.food@example.com',
    title: 'Metal detector calibration drift',
    description: 'Mettler-Toledo metal detector sensitivity drift; false rejects increased 40%.',
    priority: 'high',
    status: 'new',
    tags: ['metal-detector', 'calibration', 'mettler-toledo', 'quality'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },

  // Alice's tickets (Demo customer)
  {
    customerId: 'customer1@example.com',
    title: 'Preventive maintenance check',
    description: 'Annual maintenance due for facility equipment (air handling, generators, fire suppression).',
    priority: 'low',
    status: 'new',
    tags: ['maintenance', 'inspection', 'facility'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'customer1@example.com',
    title: 'Loading dock door sensor replacement',
    description: 'Dock door #4 sensor intermittently failing; door sometimes will not close.',
    priority: 'medium',
    status: 'new',
    tags: ['door', 'sensor', 'safety'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },

  // Bob's tickets (Demo customer)
  {
    customerId: 'customer2@example.com',
    title: 'Upgrade request for control system',
    description: 'Requesting upgrade for existing PLC system – need consultation on compatibility and migration plan.',
    priority: 'low',
    status: 'new',
    tags: ['upgrade', 'plc', 'automation'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  },
  {
    customerId: 'customer2@example.com',
    title: 'New equipment installation quote',
    description: 'Requesting quote for installation of new conveyor system – need site survey and timeline estimate.',
    priority: 'medium',
    status: 'new',
    tags: ['quote', 'installation', 'conveyor'],
    // Pre-assigned to Carol
    assigned_to: 'service1'
  }
];

// Pre-selected tickets array remains as is (for other parts of code)
const ticketsToAssign = [
  'Toyota 8FGU25 forklift hydraulic leak',
  'CAT excavator won\'t start',
  'Dock leveler malfunction - Bay 3',
  'CNC machine spindle alignment error',
  'Conveyor belt misalignment',
  'Automated storage retrieval system failure',
  'John Deere combine harvester engine overheating',
  'Baler hydraulic system contamination',
  'Container spreader thing not locking properly',
  'Steam kettle temperature control failure'
];

// Example AI actions (unchanged)
const testAiActions = [
  {
    userId: 'service1@example.com', // Demo service rep
    ticketId: '', // Will be set to John's forklift ticket
    inputText: 'I inspected the Toyota forklift and found a crack in the main pressure line near the mast assembly. Will need replacement parts. Adding hydraulic-repair tag and marking this as in_progress.',
    actionType: 'add_note',
    interpretedAction: {
      note_content: 'Inspection completed: Located crack in main hydraulic pressure line near mast assembly. Replacement parts required. Estimated repair time: 4-6 hours once parts arrive. Will schedule repair as soon as parts are in stock.',
      is_customer_visible: true,
      status: 'in_progress',
      tags_to_add: ['hydraulic-repair'],
      priority: 'high'
    },
    status: 'pending',
    requiresApproval: true
  },
  {
    userId: 'service1@example.com',
    ticketId: '', // Will be set to Sarah's excavator ticket
    inputText: 'changing status to pending_customer and adding a note requesting the CAT 320 serial number from the side panel. Also adding electrical-system and starter-motor tags.',
    actionType: 'add_note',
    interpretedAction: {
      note_content: 'To proceed with ordering the correct starter motor, please provide the CAT 320 serial number located on the side panel of the excavator. This will ensure compatibility and minimize equipment downtime. The serial number should be a 7-digit code starting with "CAT".',
      is_customer_visible: true,
      status: 'pending_customer',
      tags_to_add: ['electrical-system', 'starter-motor'],
      priority: 'urgent'
    },
    status: 'pending',
    requiresApproval: true
  },
  {
    userId: 'service1@example.com',
    ticketId: '', // Will be set to Lisa's CNC ticket
    inputText: 'assigning this CNC spindle issue to myself and adding precision-machining and spindle-repair tags.',
    actionType: 'update_tags',
    interpretedAction: {
      note_content: 'Taking ownership of this spindle alignment issue. Will bring calibration equipment for on-site inspection tomorrow morning. Initial assessment suggests possible bearing wear or misalignment in the spindle assembly.',
      is_customer_visible: false,
      tags_to_add: ['precision-machining', 'spindle-repair'],
      tags_to_remove: []
    },
    status: 'pending',
    requiresApproval: true
  },
  {
    userId: 'service1@example.com',
    ticketId: '', // Will be set to Mike's dock leveler ticket
    inputText: 'taking this dock leveler ticket',
    actionType: 'assign_ticket',
    interpretedAction: {
      note_content: 'Assigning this dock leveler issue to myself. Based on the symptoms described, I suspect either a hydraulic valve malfunction or a faulty limit switch. Will bring diagnostic equipment for a thorough system check.',
      is_customer_visible: false,
      assign_to: '' // Will be set to Carol’s UUID
    },
    status: 'pending',
    requiresApproval: true
  }
];

async function seedTestData(supabase: any) {
  console.log('Starting test data seeding process');
  
  try {
    // Delete all existing tickets and actions first
    console.log('Cleaning up existing data...');
    
    // Delete all AI actions first (due to foreign key constraints)
    const { error: actionDeleteError } = await supabase
      .from('ai_actions')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Match all UUIDs
    
    if (actionDeleteError) {
      console.error('Error deleting AI actions:', actionDeleteError);
      return { success: false, error: 'Failed to clean up AI actions' };
    }
    console.log('Existing AI actions deleted');

    // Delete all tickets
    const { error: ticketDeleteError } = await supabase
      .from('tickets')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Match all UUIDs
    
    if (ticketDeleteError) {
      console.error('Error deleting tickets:', ticketDeleteError);
      return { success: false, error: 'Failed to clean up tickets' };
    }
    console.log('Existing tickets deleted');

    // Verify tickets are deleted
    const { data: remainingTickets, error: checkError } = await supabase
      .from('tickets')
      .select('id');
    
    if (checkError) {
      console.error('Error checking remaining tickets:', checkError);
    } else if (remainingTickets && remainingTickets.length > 0) {
      console.error(`Found ${remainingTickets.length} remaining tickets, aborting`);
      return { success: false, error: 'Failed to delete all tickets' };
    }
    console.log('Verified all tickets are deleted');

    // Get or create demo service rep first
    console.log('Setting up demo service rep...');
    const demoServiceRep = testServiceReps.find(rep => rep.email === 'service1@example.com');
    if (!demoServiceRep) {
      throw new Error('Demo service rep not found in test data');
    }

    // Try to get existing user first
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === demoServiceRep.email);
    let demoServiceRepId = existingUser?.id;

    // Create user if doesn't exist
    if (!demoServiceRepId) {
      const { data: newUser, error: demoRepError } = await supabase.auth.admin.createUser({
        email: demoServiceRep.email,
        password: demoServiceRep.password,
        email_confirm: true,
        user_metadata: demoServiceRep.data
      });

      if (demoRepError) {
        console.error('Failed to create demo service rep:', demoRepError.message);
        return { success: false, error: 'Failed to create demo service rep' };
      }

      demoServiceRepId = newUser.user.id;
      console.log(`Created demo service rep with ID: ${demoServiceRepId}`);
    } else {
      console.log(`Using existing demo service rep with ID: ${demoServiceRepId}`);
    }

    // Create remaining service reps
    console.log('Creating remaining service reps...');
    const serviceRepIds = new Map<string, string>();
    serviceRepIds.set('service1@example.com', demoServiceRepId);
    
    for (const user of testServiceReps) {
      if (user.email === 'service1@example.com') continue;

      const existingRep = existingUsers?.users?.find(u => u.email === user.email);
      if (existingRep) {
        console.log(`Using existing service rep ${user.email} with ID: ${existingRep.id}`);
        serviceRepIds.set(user.email, existingRep.id);
        continue;
      }
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.data
      });

      if (error) {
        console.error(`Failed to create service rep ${user.email}:`, error.message);
      } else {
        console.log(`Created service rep ${user.email} with ID: ${data.user.id}`);
        serviceRepIds.set(user.email, data.user.id);
      }
    }

    // Create or get customers
    console.log('Setting up test customers...');
    const customerIds = new Map<string, string>();
    for (const user of testCustomers) {
      const existingCustomer = existingUsers?.users?.find(u => u.email === user.email);
      if (existingCustomer) {
        console.log(`Using existing customer ${user.email} with ID: ${existingCustomer.id}`);
        customerIds.set(user.email, existingCustomer.id);
        continue;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.data
      });

      if (error) {
        console.error(`Failed to create customer ${user.email}:`, error.message);
      } else {
        console.log(`Created customer ${user.email} with ID: ${data.user.id}`);
        customerIds.set(user.email, data.user.id);
      }
    }

    // Create or get admin users
    console.log('Setting up test admins...');
    for (const user of testAdmins) {
      const existingAdmin = existingUsers?.users?.find(u => u.email === user.email);
      if (existingAdmin) {
        console.log(`Using existing admin ${user.email} with ID: ${existingAdmin.id}`);
        continue;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.data
      });

      if (error) {
        console.error(`Failed to create admin ${user.email}:`, error.message);
      } else {
        console.log(`Created admin ${user.email} with ID: ${data.user.id}`);
      }
    }

    // Create tickets
    console.log('Creating test tickets...');
    const ticketIds = new Map<string, string>();
    // When inserting tickets, override assigned_to based on our intended set:
    // If ticket.assigned_to is 'service1', then assign with demoServiceRepId.
    // If ticket.assigned_to is null, leave it as null.
    for (const ticket of testTickets) {
      const customerId = customerIds.get(ticket.customerId);
      if (!customerId) {
        console.error(`Customer ID not found for ${ticket.customerId}`);
        continue;
      }
      
      // If ticket.assigned_to is our placeholder "service1", replace with demoServiceRepId.
      const assigned = (ticket.assigned_to === 'service1') ? demoServiceRepId : ticket.assigned_to || null;
      
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          customer_id: customerId,
          assigned_to: assigned,
          tags: ticket.tags
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to create ticket ${ticket.title}:`, error.message);
      } else {
        console.log(`Created ticket: ${ticket.title}${assigned ? ' (assigned)' : ' (unassigned)'}`);
        ticketIds.set(ticket.title, data.id);
      }
    }

    // Create AI actions (unchanged)
    console.log('Creating test AI actions...');
    for (const action of testAiActions) {
      let ticketId = '';
      const ticketMappings = {
        'Toyota 8FGU25 forklift hydraulic leak': ['Toyota forklift', 'hydraulic leak', 'forklift'],
        'CAT excavator won\'t start': ['CAT 320', 'excavator', 'won\'t start'],
        'CNC machine spindle alignment error': ['CNC spindle', 'spindle alignment', 'spindle issue'],
        'Dock leveler malfunction - Bay 3': ['dock leveler', 'leveler', 'Bay 3']
      };

      for (const [title, keywords] of Object.entries(ticketMappings)) {
        if (keywords.some(keyword => 
          action.inputText.toLowerCase().includes(keyword.toLowerCase()) ||
          (action.interpretedAction.note_content || '').toLowerCase().includes(keyword.toLowerCase())
        )) {
          ticketId = ticketIds.get(title) || '';
          if (ticketId) {
            console.log(`Matched action to ticket: ${title} (ID: ${ticketId})`);
          } else {
            console.error(`Found matching title "${title}" but no corresponding ticket ID`);
          }
          break;
        }
      }

      if (!ticketId) {
        console.error('Could not find ticket ID for action:', action.inputText);
        continue;
      }

      if (action.actionType === 'assign_ticket') {
        action.interpretedAction.assign_to = demoServiceRepId;
      }

      const { error } = await supabase
        .from('ai_actions')
        .insert({
          user_id: demoServiceRepId,
          ticket_id: ticketId,
          input_text: action.inputText,
          action_type: action.actionType,
          interpreted_action: action.interpretedAction,
          status: action.status,
          requires_approval: action.requiresApproval
        });

      if (error) {
        console.error('Failed to create AI action:', error.message);
      } else {
        console.log('Created AI action for ticket:', ticketId);
      }
    }

    return { success: true, message: 'Test data seeding completed successfully' };

  } catch (error) {
    console.error('Error in seedTestData:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'text/plain'
      }
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  const result = await seedTestData(supabase);

  return new Response(
    JSON.stringify(result),
    { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      } 
    }
  );
});