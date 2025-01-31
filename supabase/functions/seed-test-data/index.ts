// Setup type definitions for built-in Supabase Runtime APIs
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
  // Original demo service reps from seed-users.ts
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
  // Our new test service reps
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

// 30 tickets with diverse issues and writing styles
const testTickets = [
  // John's tickets (Warehouse) - formal, precise
  {
    customerId: 'john.warehouse@example.com',
    title: 'Toyota 8FGU25 forklift hydraulic leak',
    description: 'Our main warehouse forklift (Toyota 8FGU25, Serial #8FGU25-12345) is experiencing a significant hydraulic leak from the mast assembly. Fluid loss is approximately 200ml per shift. Need urgent repair as this is our primary loading equipment.',
    priority: 'high',
    status: 'new',
    tags: ['forklift', 'hydraulic', 'leak', 'toyota']
  },
  {
    customerId: 'john.warehouse@example.com',
    title: 'Scheduled maintenance for Raymond Reach truck',
    description: 'Requesting routine maintenance for our Raymond Reach truck (Model 7500). Unit has logged 2000 hours since last service. No immediate issues but due for inspection.',
    priority: 'medium',
    status: 'new',
    tags: ['reach-truck', 'maintenance', 'raymond']
  },

  // Sarah's tickets (Construction) - brief, urgent
  {
    customerId: 'sarah.construction@example.com',
    title: 'CAT excavator won\'t start',
    description: 'CAT 320 won\'t start. No response when turning key. Batteries seem ok. Need ASAP - holding up site work!!',
    priority: 'urgent',
    status: 'new',
    tags: ['excavator', 'caterpillar', 'electrical']
  },
  {
    customerId: 'sarah.construction@example.com',
    title: 'Bobcat skid steer tracks loose',
    description: 'Tracks getting loose on Bobcat S650. Making clacking noise. Getting worse past 2 days.',
    priority: 'high',
    status: 'new',
    tags: ['bobcat', 'tracks', 'noise']
  },

  // Mike's tickets (Logistics) - detailed, systematic
  {
    customerId: 'mike.logistics@example.com',
    title: 'Dock leveler malfunction - Bay 3',
    description: 'Loading dock leveler in Bay 3 (Blue Giant model XDS) not maintaining level position. Issue occurs under load. Troubleshooting steps completed:\n1. Verified hydraulic pressure\n2. Checked limit switches\n3. Inspected lip hinge\nProblem persists. Need technical inspection.',
    priority: 'high',
    status: 'new',
    tags: ['dock-leveler', 'hydraulic', 'blue-giant']
  },
  {
    customerId: 'mike.logistics@example.com',
    title: 'Electric pallet jack battery issues',
    description: 'Crown PE4500 electric pallet jack showing reduced runtime after charging. Battery indicators:\n- Full charge reading\n- Runtime: 4hrs (normally 7-8hrs)\n- No visible corrosion\nCharger diagnostic shows normal function.',
    priority: 'medium',
    status: 'open',
    tags: ['pallet-jack', 'battery', 'crown']
  },

  // Lisa's tickets (Manufacturing) - technical, specific
  {
    customerId: 'lisa.manufacturing@example.com',
    title: 'CNC machine spindle alignment error',
    description: 'Haas VF-2SS vertical machining center reporting spindle alignment errors (Code: AL-278). Tolerance verification shows 0.02mm deviation at 1000 RPM. Production quality affected. Required tolerance: ±0.01mm.',
    priority: 'urgent',
    status: 'new',
    tags: ['cnc', 'haas', 'spindle', 'precision']
  },
  {
    customerId: 'lisa.manufacturing@example.com',
    title: 'Robot arm calibration drift',
    description: 'FANUC R-2000iC robot arm experiencing progressive calibration drift during extended operations. Pick-and-place accuracy degrading by ~0.5mm per 8-hour shift. TCP recalibration required daily instead of weekly.',
    priority: 'high',
    status: 'open',
    tags: ['robot', 'fanuc', 'calibration']
  },

  // Dave's tickets (Mining) - direct, safety-focused
  {
    customerId: 'dave.mining@example.com',
    title: 'Conveyor belt misalignment',
    description: 'Main crusher feed conveyor belt misaligned. Safety sensors triggering emergency stops. Belt showing wear on edges. SAFETY CRITICAL - risk of belt failure and material spillage.',
    priority: 'urgent',
    status: 'new',
    tags: ['conveyor', 'safety', 'belt']
  },
  {
    customerId: 'dave.mining@example.com',
    title: 'Hydraulic drill rig pressure loss',
    description: 'Atlas Copco D65 drill rig losing pressure during operation. Pressure drops from 200 bar to 150 bar within 30 mins. Multiple pressure sensors checked. No visible leaks. Need inspection before next shift.',
    priority: 'high',
    status: 'open',
    tags: ['drill-rig', 'hydraulic', 'atlas-copco']
  },

  // Karen's tickets (Retail) - customer-focused, efficiency-oriented
  {
    customerId: 'karen.retail@example.com',
    title: 'Automated storage retrieval system failure',
    description: 'ASRS in Zone B completely offline. 12 picking stations affected. Error code E-235 on main console. Already tried emergency reset procedure. Need immediate assistance - impacting order fulfillment SLAs.',
    priority: 'urgent',
    status: 'new',
    tags: ['asrs', 'automation', 'warehouse']
  },
  {
    customerId: 'karen.retail@example.com',
    title: 'Conveyor belt speed sensor malfunction',
    description: 'Package routing conveyor showing inconsistent speeds. Speed readout fluctuating between 0.2-0.8 m/s when set to 0.5 m/s. Causing package jams at sorting stations.',
    priority: 'high',
    status: 'new',
    tags: ['conveyor', 'sensor', 'sorting']
  },
  {
    customerId: 'karen.retail@example.com',
    title: 'Pallet wrapper tension issues',
    description: 'Automatic pallet wrapper applying inconsistent tension. Film breaking frequently. Tested with different film rolls - same issue. Machine details: Phoenix PRRA-2000.',
    priority: 'medium',
    status: 'new',
    tags: ['pallet-wrapper', 'maintenance']
  },

  // Tom's tickets (Agriculture) - weather-aware, seasonal context
  {
    customerId: 'tom.agriculture@example.com',
    title: 'John Deere combine harvester engine overheating',
    description: 'S780 combine showing high temp warnings after 2hrs operation. Radiator clean, coolant full. Harvest season starts next week - critical to resolve. Unit ID: JD-S780-2345.',
    priority: 'urgent',
    status: 'new',
    tags: ['combine', 'john-deere', 'engine', 'cooling']
  },
  {
    customerId: 'tom.agriculture@example.com',
    title: 'Irrigation pump pressure fluctuation',
    description: 'Center pivot irrigation system showing pressure drops. Grundfos pump (Model CR 95-4) cycling irregularly. Flow meter readings unstable between 200-400 GPM. 500 acres affected.',
    priority: 'high',
    status: 'new',
    tags: ['irrigation', 'pump', 'grundfos']
  },
  {
    customerId: 'tom.agriculture@example.com',
    title: 'Grain auger bearing noise',
    description: 'Westfield MK130-71 grain auger making loud grinding noise at main drive bearing. Need inspection before harvest. Currently stored in Barn 3.',
    priority: 'medium',
    status: 'new',
    tags: ['auger', 'bearing', 'westfield']
  },

  // Rachel's tickets (Recycling) - environmental focus, process-oriented
  {
    customerId: 'rachel.recycling@example.com',
    title: 'Baler hydraulic system contamination',
    description: 'Marathon V6030 auto-tie baler reporting high particle count in hydraulic system. Pressure dropping during compression cycle. Environmental concern due to potential leak. Need inspection and fluid analysis.',
    priority: 'high',
    status: 'new',
    tags: ['baler', 'hydraulic', 'marathon', 'contamination']
  },
  {
    customerId: 'rachel.recycling@example.com',
    title: 'Shredder overload protection trips',
    description: 'Industrial shredder (UNTHA RS40) repeatedly triggering overload protection. Occurs with normal material load. Already checked blade condition and drive belt tension. Unit run time: 3,892 hours.',
    priority: 'high',
    status: 'new',
    tags: ['shredder', 'electrical', 'untha']
  },
  {
    customerId: 'rachel.recycling@example.com',
    title: 'Magnetic separator belt misalignment',
    description: 'Eriez suspended magnet showing belt tracking issues. Belt moving 15mm to left side. Affecting separation efficiency of ferrous materials. Please check during non-peak hours.',
    priority: 'medium',
    status: 'new',
    tags: ['separator', 'belt', 'eriez']
  },

  // Paul's tickets (Port Operations) - colloquial style
  {
    customerId: 'paul.port@example.com',
    title: 'Container spreader thing not locking properly',
    description: 'Hey guys, got a real headache with the Kalmar container handler (the big yellow one, TH-458). Those twistlock thingies aren\'t clicking in right. Safety system keeps beeping at us and won\'t let us lift. Got a ship waiting at B5 and the boss is breathing down my neck!',
    priority: 'urgent',
    status: 'new',
    tags: ['container-handler', 'kalmar', 'spreader', 'safety']
  },
  {
    customerId: 'paul.port@example.com',
    title: 'STS Crane #3 keeps losing power',
    description: 'That ZPMC crane we got in 2018 is acting up again. You know, the 65-tonner? Power keeps dropping out when we swing the trolley around. Computer\'s flashing some F-387 code at us. Real pain when we\'re trying to work a vessel.',
    priority: 'high',
    status: 'new',
    tags: ['gantry-crane', 'electrical', 'zpmc']
  },
  {
    customerId: 'paul.port@example.com',
    title: 'Low tire pressure on the reach stacker',
    description: 'That fancy tire monitoring system on the Hyster is going nuts about the right front tire. Says it\'s running at like 85-90 PSI when it should be 125. Been like this all week. Can someone take a look? It\'s the RS45-31CH if that helps.',
    priority: 'medium',
    status: 'new',
    tags: ['reach-stacker', 'hyster', 'tires']
  },

  // Amy's tickets (Food Processing) - hygiene conscious, production impact
  {
    customerId: 'amy.food@example.com',
    title: 'Steam kettle temperature control failure',
    description: 'Groen BPM-40G steam kettle not maintaining set temperature. Digital control panel unresponsive. Unit is clean and descaled. Production line 2 affected. Need FDA-compliant repair.',
    priority: 'urgent',
    status: 'new',
    tags: ['kettle', 'temperature', 'groen', 'food-safety']
  },
  {
    customerId: 'amy.food@example.com',
    title: 'Packaging line servo motor fault',
    description: 'Servo motor on Multivac R535 packaging line throwing Error 22-8B. Affecting seal integrity. Already checked encoder and power supply. Need food-grade compatible solution.',
    priority: 'high',
    status: 'new',
    tags: ['packaging', 'servo', 'multivac']
  },
  {
    customerId: 'amy.food@example.com',
    title: 'Metal detector calibration drift',
    description: 'Mettler-Toledo metal detector on Line 3 showing sensitivity drift. False rejects increased 40% since last calibration. HACCP compliance at risk. Calibration certificate needed after service.',
    priority: 'high',
    status: 'new',
    tags: ['metal-detector', 'calibration', 'mettler-toledo', 'quality']
  },

  // Alice's tickets (Demo customer) - general maintenance
  {
    customerId: 'customer1@example.com',
    title: 'Preventive maintenance check',
    description: 'Annual maintenance due for facility equipment. Please schedule inspection for: \n1. Air handling units\n2. Emergency generators\n3. Fire suppression systems',
    priority: 'low',
    status: 'new',
    tags: ['maintenance', 'inspection', 'facility']
  },
  {
    customerId: 'customer1@example.com',
    title: 'Loading dock door sensor replacement',
    description: 'Safety sensor on dock door #4 intermittently failing. Door sometimes won\'t close. Need replacement parts and service.',
    priority: 'medium',
    status: 'new',
    tags: ['door', 'sensor', 'safety']
  },

  // Bob's tickets (Demo customer) - equipment upgrades
  {
    customerId: 'customer2@example.com',
    title: 'Upgrade request for control system',
    description: 'Looking to upgrade the existing PLC system to newer model. Need consultation on compatible replacements and migration plan.',
    priority: 'low',
    status: 'new',
    tags: ['upgrade', 'plc', 'automation']
  },
  {
    customerId: 'customer2@example.com',
    title: 'New equipment installation quote',
    description: 'Requesting quote for installation of new conveyor system. Need site survey and timeline estimate.',
    priority: 'medium',
    status: 'new',
    tags: ['quote', 'installation', 'conveyor']
  }
];

// Pre-selected tickets to be assigned (about 1/3 of all tickets)
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

// Example AI actions for each type
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
      assign_to: '' // Will be set to service1's ID
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
      if (user.email === 'service1@example.com') continue; // Skip demo rep as already handled

      // Check if user exists
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
      // Check if customer exists
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
      // Check if admin exists
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
    for (const ticket of testTickets) {
      const customerId = customerIds.get(ticket.customerId);
      if (!customerId) {
        console.error(`Customer ID not found for ${ticket.customerId}`);
        continue;
      }

      // If this ticket is in the pre-selected list, assign it to a random service rep
      const assignedTo = ticketsToAssign.includes(ticket.title)
        ? serviceRepIds.get(['service1@example.com', 'service2@example.com'][Math.floor(Math.random() * 2)])
        : null;

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          customer_id: customerId,
          assigned_to: assignedTo,
          tags: ticket.tags
        })
        .select()
        .single();

      if (error) {
        console.error(`Failed to create ticket ${ticket.title}:`, error.message);
      } else {
        console.log(`Created ticket: ${ticket.title}${assignedTo ? ' (assigned)' : ''}`);
        ticketIds.set(ticket.title, data.id);
      }
    }

    // Create AI actions
    console.log('Creating test AI actions...');
    for (const action of testAiActions) {
      // Get ticket ID based on action type and content
      let ticketId = '';
      
      // Define ticket mappings with exact titles from testTickets
      const ticketMappings = {
        'Toyota 8FGU25 forklift hydraulic leak': ['Toyota forklift', 'hydraulic leak', 'forklift'],
        'CAT excavator won\'t start': ['CAT 320', 'excavator', 'won\'t start'],
        'CNC machine spindle alignment error': ['CNC spindle', 'spindle alignment', 'spindle issue'],
        'Dock leveler malfunction - Bay 3': ['dock leveler', 'leveler', 'Bay 3']
      };

      // Find matching ticket
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

      // For assign_ticket actions, set the assignTo to the service rep's ID
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

// Simple endpoint without auth for development use
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