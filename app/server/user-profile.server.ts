import { json, redirect } from "@remix-run/node";
import type User from "~/models/user.model";
import type ValidationError from "~/models/validation-error.model";
import UserApiService from "~/services/user-api.service";
import { commitSession, getSession } from "~/session.server";

export type LoaderData = {
  user: User;
  success: string;
  errors: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
};

export const userProfileLoader = async (request: Request) => {
  const session = await getSession(request.headers.get('Cookie'));

  const userId = session.get('userId');
  const accessToken = session.get('accessToken');

  const apiResponse = await UserApiService.readOne(userId, accessToken);

  const data = { 
    user: apiResponse.body.data,
    success: session.get('success'),
    errors: {
      firstName: session.get('firstNameError'),
      lastName: session.get('lastNameError'),
      email: session.get('emailError'),
      phoneNumber: session.get('phoneNumberError'),
    }
  };

  return json<LoaderData>(data, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export const userProfileAction = async (request: Request, redirectTo: string) => {
  const session = await getSession(request.headers.get('Cookie'));

  const userId = session.get('userId');
  const accessToken = session.get('accessToken');

  const userResponse = await UserApiService.readOne(userId, accessToken);

  const user = userResponse.body.data;

  const form = await request.formData();
  const firstName = form.get('firstName')?.toString();
  const lastName = form.get('lastName')?.toString();
  const email = form.get('email')?.toString();
  const phoneNumber = form.get('phoneNumber')?.toString();

  const apiResponse = await UserApiService.update(
    userId, 
    {
      email: user.email !== email ? email : undefined,
      lastName: user.lastName !== lastName ? lastName : undefined,
      firstName: user.firstName !== firstName ? firstName : undefined,
      phoneNumber: user.phoneNumber !== phoneNumber ? phoneNumber : undefined,
    }, 
    accessToken
  );

  if (apiResponse.status === 200) {
    session.flash('success', apiResponse.body.message);
  } else if (apiResponse.status === 400) {
    const errors = apiResponse.body.data as ValidationError[];
    errors.forEach(item => session.flash(`${item.name}Error`, item.message));
  }
  
  return redirect(`/${redirectTo}/profile`, {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}
