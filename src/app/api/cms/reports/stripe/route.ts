import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
       return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let createdFilter: any = {};
    if (startDateParam && endDateParam) {
      createdFilter = {
        gte: Math.floor(new Date(startDateParam).getTime() / 1000),
        lte: Math.floor(new Date(endDateParam).getTime() / 1000),
      };
    }

    const [balance, charges, subscriptions, customers] = await Promise.all([
      stripe.balance.retrieve(),
      stripe.charges.list({ 
        limit: 100,
        ...(Object.keys(createdFilter).length > 0 && { created: createdFilter })
      }),
      stripe.subscriptions.list({ 
        status: 'active', 
        limit: 100,
        ...(Object.keys(createdFilter).length > 0 && { created: createdFilter })
      }),
      stripe.customers.list({ 
        limit: 100,
        ...(Object.keys(createdFilter).length > 0 && { created: createdFilter })
      }),
    ]);

    return NextResponse.json({
      balance,
      charges: charges.data,
      subscriptions: subscriptions.data,
      customers: customers.data,
    });
  } catch (error) {
    console.error('Error fetching Stripe data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe data' },
      { status: 500 }
    );
  }
}
