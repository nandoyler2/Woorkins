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
            })
            .eq('id', metadata.proposal_id);

          console.log('Updated proposal payment status to paid_escrow');
        } else if (metadata.negotiation_id) {
          await supabase
            .from('negotiations')
            .update({
              payment_status: 'paid_escrow',
            })
            .eq('id', metadata.negotiation_id);

          console.log('Updated negotiation payment status to paid_escrow');
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
        
        // This happens when release-payment is called and escrow is released
        // The money is now in our platform account
        const paymentIntentId = charge.payment_intent as string;
        
        // Get the payment intent to access metadata
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const metadata = paymentIntent.metadata;

        if (metadata.proposal_id) {
          const { data: proposal } = await supabase
            .from('proposals')
            .select('freelancer_id, freelancer_amount')
            .eq('id', metadata.proposal_id)
            .single();

          if (proposal && proposal.freelancer_amount) {
            // Move from pending to available in wallet
            const { data: wallet } = await supabase
              .from('freelancer_wallet')
              .select('*')
              .eq('profile_id', proposal.freelancer_id)
              .single();

            if (wallet) {
              await supabase
                .from('freelancer_wallet')
                .update({
                  available_balance: (wallet.available_balance || 0) + proposal.freelancer_amount,
                  pending_balance: Math.max(0, (wallet.pending_balance || 0) - proposal.freelancer_amount),
                  total_earned: (wallet.total_earned || 0) + proposal.freelancer_amount,
                })
                .eq('profile_id', proposal.freelancer_id);

              console.log('Updated freelancer wallet - funds now available for withdrawal');
            }
          }
        } else if (metadata.negotiation_id) {
          const { data: negotiation } = await supabase
            .from('negotiations')
            .select('business_id')
            .eq('id', metadata.negotiation_id)
            .single();

          if (negotiation && metadata.freelancer_amount) {
            const freelancerAmount = parseFloat(metadata.freelancer_amount);

            // Get business profile_id
            const { data: businessProfile } = await supabase
              .from('business_profiles')
              .select('profile_id')
              .eq('id', negotiation.business_id)
              .single();

            if (businessProfile) {
              const { data: wallet } = await supabase
                .from('freelancer_wallet')
                .select('*')
                .eq('profile_id', businessProfile.profile_id)
                .single();

              if (wallet) {
                await supabase
                  .from('freelancer_wallet')
                  .update({
                    available_balance: (wallet.available_balance || 0) + freelancerAmount,
                    pending_balance: Math.max(0, (wallet.pending_balance || 0) - freelancerAmount),
                    total_earned: (wallet.total_earned || 0) + freelancerAmount,
                  })
                  .eq('profile_id', businessProfile.profile_id);

                console.log('Updated business wallet - funds now available for withdrawal');
              }
            }
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if it's a woorkoins purchase
        if (paymentIntent.metadata?.type === 'woorkoins_purchase') {
          console.log('Woorkoins purchase succeeded:', paymentIntent.id);
          
          const profileId = paymentIntent.metadata.profile_id;
          const woorkoinsAmount = parseInt(paymentIntent.metadata.woorkoins_amount);
          
          // Get or create woorkoins balance
          const { data: existingBalance } = await supabase
            .from('woorkoins_balance')
            .select('*')
            .eq('profile_id', profileId)
            .single();
          
          if (existingBalance) {
            // Update existing balance
            await supabase
              .from('woorkoins_balance')
              .update({ 
                balance: existingBalance.balance + woorkoinsAmount,
                updated_at: new Date().toISOString()
              })
              .eq('profile_id', profileId);
          } else {
            // Create new balance
            await supabase
              .from('woorkoins_balance')
              .insert({
                profile_id: profileId,
                balance: woorkoinsAmount
              });
          }
          
          // Record transaction
          await supabase
            .from('woorkoins_transactions')
            .insert({
              profile_id: profileId,
              amount: woorkoinsAmount,
              type: 'purchase',
              description: `Compra de ${woorkoinsAmount} Woorkoins`,
              stripe_payment_intent_id: paymentIntent.id
            });
          
          console.log(`Added ${woorkoinsAmount} woorkoins to profile ${profileId}`);
        }
        break;
      }

      case 'payout.paid': {
        const payout = event.data.object as Stripe.Payout;
        console.log('Payout paid (withdrawal processed):', payout.id);
        
        // Update withdrawal request status
        await supabase
          .from('withdrawal_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_payout_id', payout.id);
        break;
      }

      case 'payout.failed': {
        const payout = event.data.object as Stripe.Payout;
        console.log('Payout failed:', payout.id);
        
        // Update withdrawal request and refund wallet
        const { data: withdrawal } = await supabase
          .from('withdrawal_requests')
          .select('profile_id, amount')
          .eq('stripe_payout_id', payout.id)
          .single();

        if (withdrawal) {
          await supabase
            .from('withdrawal_requests')
            .update({
              status: 'failed',
              error_message: 'Payout failed - please contact support',
            })
            .eq('stripe_payout_id', payout.id);

          // Refund to available balance
          const { data: wallet } = await supabase
            .from('freelancer_wallet')
            .select('*')
            .eq('profile_id', withdrawal.profile_id)
            .single();

          if (wallet) {
            await supabase
              .from('freelancer_wallet')
              .update({
                available_balance: (wallet.available_balance || 0) + withdrawal.amount,
                total_withdrawn: Math.max(0, (wallet.total_withdrawn || 0) - withdrawal.amount),
              })
              .eq('profile_id', withdrawal.profile_id);
          }

          // Notify user
          await supabase.from('notifications').insert({
            user_id: withdrawal.profile_id,
            type: 'payment',
            title: 'Erro no Saque',
            message: 'Houve um problema ao processar seu saque. O valor foi devolvido para sua carteira.',
            link: '/payment-settings',
          });
        }
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