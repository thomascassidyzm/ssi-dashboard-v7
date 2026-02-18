/**
 * Orchestrator routes — message passing between pipeline orchestrator agent and dashboard.
 *
 * Agent posts checkpoint messages, human responds via dashboard, agent polls for responses.
 * All messages stored in orchestrator_messages table (Supabase).
 *
 * Factory: receives ctx with supabase, emitPipelineEvent, config.
 */

const { Router } = require('express');

module.exports = function (ctx) {
  const router = Router();

  // ===========================================================================
  // POST /orchestrator/message/:courseCode — Agent posts a checkpoint message
  // ===========================================================================
  router.post('/orchestrator/message/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { checkpoint, message, metadata = {} } = req.body;

      if (!message) {
        return res.status(400).json({ ok: false, error: 'message is required' });
      }

      const { data, error } = await ctx.supabase
        .from('orchestrator_messages')
        .insert({
          course_code: courseCode,
          direction: 'agent_to_human',
          checkpoint: checkpoint || null,
          message,
          metadata,
          status: 'pending'
        })
        .select('id, created_at')
        .single();

      if (error) throw error;

      // Broadcast to dashboard via WebSocket
      ctx.emitPipelineEvent(courseCode, 'orchestrator:message', {
        id: data.id,
        checkpoint,
        message,
        metadata,
        created_at: data.created_at
      });

      res.json({ ok: true, message_id: data.id, created_at: data.created_at });
    } catch (err) {
      console.error('[ORCHESTRATOR] Message error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /orchestrator/poll/:courseCode/:messageId — Agent polls for response
  // ===========================================================================
  router.get('/orchestrator/poll/:courseCode/:messageId', async (req, res) => {
    try {
      const { messageId } = req.params;

      const { data, error } = await ctx.supabase
        .from('orchestrator_messages')
        .select('status, response, response_action, responded_at')
        .eq('id', messageId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ ok: false, error: 'Message not found' });
        }
        throw error;
      }

      res.json({
        ok: true,
        status: data.status,
        response_action: data.response_action,
        response: data.response,
        responded_at: data.responded_at
      });
    } catch (err) {
      console.error('[ORCHESTRATOR] Poll error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /orchestrator/respond/:courseCode/:messageId — Human responds to agent
  // ===========================================================================
  router.post('/orchestrator/respond/:courseCode/:messageId', async (req, res) => {
    try {
      const { courseCode, messageId } = req.params;
      const { action, response } = req.body;

      if (!action) {
        return res.status(400).json({ ok: false, error: 'action is required' });
      }

      const { error } = await ctx.supabase
        .from('orchestrator_messages')
        .update({
          status: 'responded',
          response_action: action,
          response: response || null,
          responded_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      // Broadcast to dashboard via WebSocket
      ctx.emitPipelineEvent(courseCode, 'orchestrator:response', {
        message_id: messageId,
        action,
        response
      });

      res.json({ ok: true, message_id: messageId, action });
    } catch (err) {
      console.error('[ORCHESTRATOR] Respond error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /orchestrator/messages/:courseCode — Full message log for dashboard
  // ===========================================================================
  router.get('/orchestrator/messages/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      const { data, error } = await ctx.supabase
        .from('orchestrator_messages')
        .select('*')
        .eq('course_code', courseCode)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      res.json({ ok: true, messages: data || [] });
    } catch (err) {
      console.error('[ORCHESTRATOR] Messages error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /orchestrator/status/:courseCode — Pipeline state + pending messages
  // ===========================================================================
  router.get('/orchestrator/status/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { getPipelineStatus } = require('../lib/pipeline.cjs');

      const pipelineStatus = await getPipelineStatus(ctx.supabase, courseCode);

      // Get any pending agent messages (agent asked something, no response yet)
      const { data: pending } = await ctx.supabase
        .from('orchestrator_messages')
        .select('id, checkpoint, message, metadata, created_at')
        .eq('course_code', courseCode)
        .eq('direction', 'agent_to_human')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      // Get latest responded message (agent may need to read it on resume)
      const { data: latestResponded } = await ctx.supabase
        .from('orchestrator_messages')
        .select('id, checkpoint, response_action, response, responded_at')
        .eq('course_code', courseCode)
        .eq('direction', 'agent_to_human')
        .eq('status', 'responded')
        .order('responded_at', { ascending: false })
        .limit(1);

      res.json({
        ok: true,
        pipeline: pipelineStatus,
        pending_messages: pending || [],
        latest_response: latestResponded?.[0] || null
      });
    } catch (err) {
      console.error('[ORCHESTRATOR] Status error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};
