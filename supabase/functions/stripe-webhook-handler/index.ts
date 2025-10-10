import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
    console.log('Webhook received:', event.type, event.id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log('Account updated:', account.id);
        
        await supabase
          .from('stripe_connected_accounts')
          .update({
            account_status: account.charges_enabled ? 'active' : 'pending',
            onboarding_completed: account.details_submitted || false,
            charges_enabled: account.charges_enabled || false,
            payouts_enabled: account.payouts_enabled || false,
            details_submitted: account.details_submitted || false,
          })
          .eq('stripe_account_id', account.id);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        
        // Update proposal or negotiation payment status
        const metadata = paymentIntent.metadata;
        if (metadata.proposal_id) {
          await supabase
            .from('proposals')
            .update({
              payment_status: 'paid_escrow',
              payment_captured_at: new Date().toISOString(),
            })
            .eq('id', metadata.proposal_id);
        } else if (metadata.negotiation_id) {
          await supabase
            .from('negotiations')
            .update({
              payment_status: 'paid_escrow',
              payment_captured_at: new Date().toISOString(),
            })
            .eq('id', metadata.negotiation_id);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        
        const metadata = paymentIntent.metadata;
        if (metadata.proposal_id) {
          await supabase
            .from('proposals')
            .update({ payment_status: 'failed' })
            .eq('id', metadata.proposal_id);
        } else if (metadata.negotiation_id) {
          await supabase
            .from('negotiations')
            .update({ payment_status: 'failed' })
            .eq('id', metadata.negotiation_id);
        }
        break;
      }

      case 'charge.captured': {
        const charge = event.data.object as Stripe.Charge;
        console.log('Charge captured (escrow released):', charge.id);
        
        // Update status to released
        const paymentIntentId = charge.payment_intent as string;
        
        await supabase
          .from('proposals')
          .update({
            payment_status: 'released',
            escrow_released_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId);
        
        await supabase
          .from('negotiations')
          .update({
            payment_status: 'released',
            escrow_released: true,
            escrow_released_at: new Date().toISOString(),
          })
          .eq('stripe_payment_intent_id', paymentIntentId);
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        console.log('Transfer created:', transfer.id);
        
        // Record transaction
        const metadata = transfer.metadata;
        if (metadata.proposal_id || metadata.negotiation_id) {
          await supabase.from('transactions').insert({
            user_id: metadata.user_id,
            business_id: metadata.business_id,
            negotiation_id: metadata.negotiation_id || null,
            type: 'payment',
            amount: transfer.amount / 100,
            status: 'released',
            stripe_transfer_id: transfer.id,
            stripe_charge_id: transfer.source_transaction as string,
            gross_amount: parseFloat(metadata.gross_amount || '0'),
            platform_fee: parseFloat(metadata.platform_fee || '0'),
            stripe_fee: parseFloat(metadata.stripe_fee || '0'),
          });
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        console.log('Payout paid:', payout.id);
        
        // Update transactions with payout info
        await supabase
          .from('transactions')
          .update({ stripe_payout_id: payout.id })
          .is('stripe_payout_id', null)
          .eq('status', 'released');
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        console.log('Payout failed:', payout.id);
        
        // Could implement retry logic or notifications here
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});