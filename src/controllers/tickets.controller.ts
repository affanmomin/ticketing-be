import { FastifyRequest, FastifyReply } from 'fastify';
import { withRlsTx } from '../db/rls';
import { TicketFilterQuery, CreateTicketBody, UpdateTicketBody } from '../schemas/tickets.schema';
import { listTickets, getTicket, createTicket, updateTicket } from '../services/tickets.service';
import { getUser } from '../services/users.service';
import { emailService } from '../services/email.service';

export async function getTicketsCtrl(req: FastifyRequest, reply: FastifyReply) {
  const q = TicketFilterQuery.parse(req.query);
  return withRlsTx(req, async (tx) => {
    const items = await listTickets(tx, q);
    return reply.send({ items, count: items.length });
  });
}

export async function getTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  return withRlsTx(req, async (tx) => reply.send(await getTicket(tx, id)));
}

export async function createTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  const body = CreateTicketBody.parse(req.body);
  return withRlsTx(req, async (tx) => {
    const ticket = await createTicket(tx, body, { userId: req.auth!.userId, tenantId: req.auth!.tenantId });
    
    // Get user data for email notification while transaction is still active
    let emailData: { reporter?: any; assignee?: any } = {};
    
    try {
      console.log('Debug: Fetching user data for email notification');
      console.log('Debug: Auth user ID:', req.auth!.userId);
      console.log('Debug: Tenant ID:', req.auth!.tenantId);
      console.log('Debug: Ticket reporter ID:', ticket.reporterId);
      
      // Get reporter information

      
      // Get assignee information if ticket is assigned
      if (ticket.assigneeId) {
        try {
          const assignee = await getUser(tx, ticket.assigneeId, req.auth!.tenantId);
          emailData.assignee = {
            id: assignee.id,
            email: assignee.email,
            name: assignee.name,
            userType: assignee.userType,
          };
          console.log('Debug: Assignee found:', assignee.email);
        } catch (error) {
          console.error('Debug: Failed to get assignee user:', error);
        }
      }
    } catch (error) {
      console.error('Debug: Error preparing email data:', error);
    }
    
    // Send email notification after response (non-blocking)
    setImmediate(async () => {
      try {
        if (emailData.reporter) {
          console.log('Debug: Sending ticket creation email');
          await emailService.sendTicketCreatedEmail({
            ticket,
            reporter: emailData.reporter,
            assignee: emailData.assignee,
          });
          console.log('Debug: Email notification sent successfully');
        } else {
          console.log('Debug: Skipping email - no reporter data available');
        }
      } catch (error) {
        console.error('Failed to send ticket creation email:', error);
      }
    });
    
    return reply.code(201).send(ticket);
  });
}

export async function updateTicketCtrl(req: FastifyRequest, reply: FastifyReply) {
  const id = (req.params as any).id as string;
  const updateData = req.body as any;
  
  return withRlsTx(req, async (tx) => {
    // Get the original ticket to track changes
    const originalTicket = await getTicket(tx, id);
    
    // Update the ticket
    const updatedTicket = await updateTicket(tx, { ...updateData, id }, req.auth!.role);
    
    // Track changes for email notification
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    if (updateData.title && updateData.title !== originalTicket.title) {
      changes.push({ field: 'Title', oldValue: originalTicket.title, newValue: updateData.title });
    }
    if (updateData.status && updateData.status !== originalTicket.status) {
      changes.push({ field: 'Status', oldValue: originalTicket.status, newValue: updateData.status });
    }
    if (updateData.priority && updateData.priority !== originalTicket.priority) {
      changes.push({ field: 'Priority', oldValue: originalTicket.priority, newValue: updateData.priority });
    }
    if (updateData.assigneeId !== undefined && updateData.assigneeId !== originalTicket.assigneeId) {
      changes.push({ field: 'Assignee', oldValue: originalTicket.assigneeId || 'Unassigned', newValue: updateData.assigneeId || 'Unassigned' });
    }
    if (updateData.dueDate !== undefined && updateData.dueDate !== originalTicket.dueDate) {
      changes.push({ field: 'Due Date', oldValue: originalTicket.dueDate || 'None', newValue: updateData.dueDate || 'None' });
    }
    
    // Get user data for email notification while transaction is still active
    let emailData: { reporter?: any; assignee?: any; changes: any[] } = { changes };
    
    if (changes.length > 0) {
      try {
        // Get reporter information
        try {
          const reporter = await getUser(tx, updatedTicket.reporterId, req.auth!.tenantId);
          emailData.reporter = {
            id: reporter.id,
            email: reporter.email,
            name: reporter.name,
            userType: reporter.userType,
          };
        } catch (error) {
          console.error('Debug: Failed to get reporter user for update email:', error);
        }
        
        // Get assignee information if ticket is assigned
        if (updatedTicket.assigneeId) {
          try {
            const assignee = await getUser(tx, updatedTicket.assigneeId, req.auth!.tenantId);
            emailData.assignee = {
              id: assignee.id,
              email: assignee.email,
              name: assignee.name,
              userType: assignee.userType,
            };
          } catch (error) {
            console.error('Debug: Failed to get assignee user for update email:', error);
          }
        }
      } catch (error) {
        console.error('Debug: Error preparing update email data:', error);
      }
    }
    
    // Send email notification after response (non-blocking)
    if (changes.length > 0) {
      setImmediate(async () => {
        try {
          if (emailData.reporter) {
            await emailService.sendTicketUpdatedEmail({
              ticket: updatedTicket,
              reporter: emailData.reporter,
              assignee: emailData.assignee,
              changes: emailData.changes,
            });
            console.log('Debug: Ticket update email sent successfully');
          } else {
            console.log('Debug: Skipping update email - no reporter data available');
          }
        } catch (error) {
          console.error('Failed to send ticket update email:', error);
        }
      });
    }
    
    return reply.send(updatedTicket);
  });
}
